using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface IVacationBalanceService
{
    /// <summary>
    /// Obtiene el saldo de un empleado para un año. Si no existe, lo crea asignándole la política por defecto.
    /// </summary>
    Task<Employee_VacationBalance?> GetOrCreateBalanceAsync(int employeeId, int year);

    /// <summary>
    /// Recalcula el saldo de un empleado sumando los días de solicitudes aprobadas.
    /// </summary>
    Task<Employee_VacationBalance?> RecalculateBalanceAsync(int employeeId, int year);

    /// <summary>
    /// Asigna masivamente saldos a todos los empleados activos para un año y política dados.
    /// </summary>
    Task<BulkAssignResult> BulkAssignBalancesAsync(int policyId, int year, int performedByUserId);

    /// <summary>
    /// Verifica si un empleado tiene suficiente saldo para una cantidad de días.
    /// </summary>
    Task<bool> HasSufficientBalanceAsync(int employeeId, int year, decimal requestedDays);
}

public class BulkAssignResult
{
    public int Created { get; set; }
    public int Skipped { get; set; }
    public int Total { get; set; }
}

public class VacationBalanceService : IVacationBalanceService
{
    private readonly AppDbContext _db;

    public VacationBalanceService(AppDbContext db) => _db = db;

    public async Task<Employee_VacationBalance?> GetOrCreateBalanceAsync(int employeeId, int year)
    {
        // Buscar saldo existente
        var balance = await _db.EmployeeVacationBalances
            .Include(b => b.Policy)
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year);

        if (balance != null)
            return balance;

        // No existe: buscar la política por defecto para ese año
        var policy = await _db.VacationPolicies
            .FirstOrDefaultAsync(p => p.Year == year);

        if (policy == null)
            return null; // No hay política configurada para ese año

        // Verificar que el empleado existe y está activo
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null || !employee.IsActive)
            return null;

        // Calcular días de arrastre del año anterior
        decimal carryOver = 0;
        var previousBalance = await _db.EmployeeVacationBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year - 1);

        if (previousBalance != null && previousBalance.RemainingDays > 0)
        {
            // Arrastrar como máximo lo que permite la política
            carryOver = Math.Min(previousBalance.RemainingDays, policy.CarryOverMaxDays);
        }

        // Crear saldo
        balance = new Employee_VacationBalance
        {
            EmployeeId = employeeId,
            PolicyId = policy.PolicyId,
            Year = year,
            AllocatedDays = policy.TotalDaysPerYear + carryOver,
            UsedDays = 0,
            RemainingDays = policy.TotalDaysPerYear + carryOver,
            UpdatedAt = DateTime.Now
        };

        _db.EmployeeVacationBalances.Add(balance);
        await _db.SaveChangesAsync();

        // Recargar con navegación
        balance = await _db.EmployeeVacationBalances
            .Include(b => b.Policy)
            .FirstAsync(b => b.BalanceId == balance.BalanceId);

        return balance;
    }

    public async Task<Employee_VacationBalance?> RecalculateBalanceAsync(int employeeId, int year)
    {
        var balance = await _db.EmployeeVacationBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year);

        if (balance == null)
            return null;

        // Sumar días de solicitudes APROBADAS para ese año
        var usedDays = await _db.VacationRequests
            .Where(r => r.EmployeeId == employeeId
                     && r.Status == "APPROVED"
                     && r.StartDate.Year == year)
            .SumAsync(r => r.RequestedDays);

        balance.UsedDays = usedDays;
        balance.RemainingDays = balance.AllocatedDays - usedDays;
        balance.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return balance;
    }

    public async Task<BulkAssignResult> BulkAssignBalancesAsync(int policyId, int year, int performedByUserId)
    {
        var policy = await _db.VacationPolicies.FindAsync(policyId);
        if (policy == null)
            throw new ArgumentException("Política no encontrada");

        // Obtener todos los empleados activos
        var activeEmployees = await _db.Employees
            .Where(e => e.IsActive)
            .Select(e => e.EmployeeId)
            .ToListAsync();

        // Obtener los que YA tienen saldo para esa política y año
        var existingBalanceEmployeeIds = await _db.EmployeeVacationBalances
            .Where(b => b.PolicyId == policyId && b.Year == year)
            .Select(b => b.EmployeeId)
            .ToListAsync();

        var toCreate = activeEmployees
            .Where(empId => !existingBalanceEmployeeIds.Contains(empId))
            .ToList();

        var newBalances = new List<Employee_VacationBalance>();

        foreach (var employeeId in toCreate)
        {
            // Calcular arrastre individual
            decimal carryOver = 0;
            var previousBalance = await _db.EmployeeVacationBalances
                .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year - 1);

            if (previousBalance != null && previousBalance.RemainingDays > 0)
            {
                carryOver = Math.Min(previousBalance.RemainingDays, policy.CarryOverMaxDays);
            }

            newBalances.Add(new Employee_VacationBalance
            {
                EmployeeId = employeeId,
                PolicyId = policyId,
                Year = year,
                AllocatedDays = policy.TotalDaysPerYear + carryOver,
                UsedDays = 0,
                RemainingDays = policy.TotalDaysPerYear + carryOver,
                UpdatedAt = DateTime.Now
            });
        }

        if (newBalances.Any())
        {
            await _db.EmployeeVacationBalances.AddRangeAsync(newBalances);
            await _db.SaveChangesAsync();
        }

        return new BulkAssignResult
        {
            Created = newBalances.Count,
            Skipped = existingBalanceEmployeeIds.Count,
            Total = activeEmployees.Count
        };
    }

    public async Task<bool> HasSufficientBalanceAsync(int employeeId, int year, decimal requestedDays)
    {
        var balance = await GetOrCreateBalanceAsync(employeeId, year);
        if (balance == null) return false;

        return balance.RemainingDays >= requestedDays;
    }
}