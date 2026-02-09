using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Application.Interfaces;

namespace SistemaFichajesVacaciones.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de saldos de vacaciones.
/// Responsabilidades:
/// - Crear/obtener saldos automáticamente con política por defecto
/// - Calcular arrastre del año anterior según límites de política
/// - Recalcular saldos basándose en solicitudes aprobadas
/// - Asignación masiva a empleados activos
/// </summary>
public class VacationBalanceService : IVacationBalanceService
{
    private readonly AppDbContext _db;

    public VacationBalanceService(AppDbContext db) => _db = db;

    /// <summary>
    /// Obtiene o crea el saldo de vacaciones de un empleado para un año.
    /// FLUJO:
    /// 1. Busca saldo existente en BD
    /// 2. Si existe → retorna
    /// 3. Si NO existe:
    ///    a) Busca política por defecto del año
    ///    b) Calcula arrastre del año anterior (respetando límite)
    ///    c) Crea saldo con días de política + arrastre
    ///    d) Guarda y retorna
    /// </summary>
    public async Task<Employee_VacationBalance?> GetOrCreateBalanceAsync(int employeeId, int year)
    {
        // 1. Buscar saldo existente (con navegación a política para evitar query adicional)
        var balance = await _db.EmployeeVacationBalances
            .Include(b => b.Policy)  // Eager loading: carga política en mismo query
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year);

        // 2. Si ya existe, retornamos directamente
        if (balance != null)
            return balance;

        // 3. No existe: buscar política por defecto del año
        // NOTA: Asumimos que solo hay UNA política activa por año
        // En sistemas más complejos, el empleado podría tener una política específica
        var policy = await _db.VacationPolicies
            .FirstOrDefaultAsync(p => p.Year == year);

        // Si no hay política configurada para ese año, no podemos crear saldo
        if (policy == null)
            return null;

        // 4. Verificar que el empleado existe y está activo
        // No creamos saldos para empleados inactivos o inexistentes
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null || !employee.IsActive)
            return null;

        // 5. Calcular días de arrastre del año anterior
        decimal carryOver = 0;
        
        // Buscar saldo del año anterior
        var previousBalance = await _db.EmployeeVacationBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year - 1);

        // Si tuvo días sobrantes el año anterior, arrastramos
        if (previousBalance != null && previousBalance.RemainingDays > 0)
        {
            // Arrastrar como MÁXIMO lo que permite la política
            // Ej: Si le sobran 8 días pero la política permite max 5 → arrastre = 5
            carryOver = Math.Min(previousBalance.RemainingDays, policy.CarryOverMaxDays);
        }

        // 6. Crear nuevo saldo
        balance = new Employee_VacationBalance
        {
            EmployeeId = employeeId,
            PolicyId = policy.PolicyId,
            Year = year,
            // DÍAS TOTALES = días de la política + arrastre calculado
            AllocatedDays = policy.TotalDaysPerYear + carryOver,
            UsedDays = 0,  // Inicialmente no ha usado nada
            RemainingDays = policy.TotalDaysPerYear + carryOver,  // Disponibles = Allocated
            UpdatedAt = DateTime.Now
        };

        _db.EmployeeVacationBalances.Add(balance);
        await _db.SaveChangesAsync();

        // 7. Recargar con navegación para retornar objeto completo
        // Esto evita lazy loading exceptions en el controller
        balance = await _db.EmployeeVacationBalances
            .Include(b => b.Policy)
            .FirstAsync(b => b.BalanceId == balance.BalanceId);

        return balance;
    }

    /// <summary>
    /// Recalcula el saldo de un empleado contando solicitudes aprobadas.
    /// USO TÍPICO:
    /// - Después de aprobar/rechazar una solicitud
    /// - Corrección manual por RRHH
    /// - Auditorías de datos
    /// 
    /// LÓGICA:
    /// 1. Suma todos los días de solicitudes APPROVED del año
    /// 2. Actualiza UsedDays con el total
    /// 3. Recalcula RemainingDays = AllocatedDays - UsedDays
    /// </summary>
    public async Task<Employee_VacationBalance?> RecalculateBalanceAsync(int employeeId, int year)
    {
        // 1. Buscar saldo existente
        var balance = await _db.EmployeeVacationBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year);

        if (balance == null)
            return null;

        // 2. Sumar TODOS los días de solicitudes aprobadas del año
        // Filtramos por:
        // - EmployeeId: del empleado específico
        // - Status: solo APPROVED (no DRAFT, SUBMITTED, REJECTED, CANCELLED)
        // - StartDate.Year: solicitudes que inician en ese año fiscal
        var usedDays = await _db.VacationRequests
            .Where(r => r.EmployeeId == employeeId
                     && r.Status == "APPROVED"
                     && r.StartDate.Year == year)
            .SumAsync(r => r.RequestedDays);  // Suma el campo RequestedDays

        // 3. Actualizar campos calculados
        balance.UsedDays = usedDays;
        balance.RemainingDays = balance.AllocatedDays - usedDays;
        balance.UpdatedAt = DateTime.Now;

        // 4. Guardar cambios
        await _db.SaveChangesAsync();
        
        return balance;
    }

    /// <summary>
    /// Asigna saldos masivamente a todos los empleados activos.
    /// ESCENARIO TÍPICO:
    /// - Inicio de año: RRHH ejecuta "Asignar política España 2025 a todos"
    /// - Nueva política: Se aplica retroactivamente
    /// 
    /// PROCESO:
    /// 1. Lista empleados activos
    /// 2. Identifica quiénes YA tienen saldo (skip)
    /// 3. Para cada empleado SIN saldo:
    ///    a) Calcula arrastre individual del año anterior
    ///    b) Crea saldo con días política + arrastre
    /// 4. Inserta en bloque (rendimiento)
    /// 5. Retorna estadísticas
    /// </summary>
    public async Task<BulkAssignResult> BulkAssignBalancesAsync(int policyId, int year, int performedByUserId)
    {
        // 1. Validar que la política existe
        var policy = await _db.VacationPolicies.FindAsync(policyId);
        if (policy == null)
            throw new ArgumentException("Política no encontrada");

        // 2. Obtener IDs de TODOS los empleados activos
        var activeEmployees = await _db.Employees
            .Where(e => e.IsActive)
            .Select(e => e.EmployeeId)
            .ToListAsync();

        // 3. Obtener empleados que YA tienen saldo para esta política/año
        // Estos se OMITEN para evitar duplicados
        var existingBalanceEmployeeIds = await _db.EmployeeVacationBalances
            .Where(b => b.PolicyId == policyId && b.Year == year)
            .Select(b => b.EmployeeId)
            .ToListAsync();

        // 4. Calcular empleados a los que hay que crear saldo
        // toCreate = activos - los que ya tienen
        var toCreate = activeEmployees
            .Where(empId => !existingBalanceEmployeeIds.Contains(empId))
            .ToList();

        var newBalances = new List<Employee_VacationBalance>();

        // 5. Para cada empleado sin saldo, calcular y crear
        foreach (var employeeId in toCreate)
        {
            // Calcular arrastre individual del año anterior
            decimal carryOver = 0;
            var previousBalance = await _db.EmployeeVacationBalances
                .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year - 1);

            if (previousBalance != null && previousBalance.RemainingDays > 0)
            {
                // Respetar límite de arrastre de la política
                carryOver = Math.Min(previousBalance.RemainingDays, policy.CarryOverMaxDays);
            }

            // Crear saldo nuevo
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

        // 6. Inserción masiva (más eficiente que uno por uno)
        if (newBalances.Any())
        {
            await _db.EmployeeVacationBalances.AddRangeAsync(newBalances);
            await _db.SaveChangesAsync();
        }

        // 7. Retornar estadísticas para informar al usuario
        return new BulkAssignResult
        {
            Created = newBalances.Count,           // Saldos creados
            Skipped = existingBalanceEmployeeIds.Count,  // Empleados que ya tenían
            Total = activeEmployees.Count          // Total de empleados activos
        };
    }

    /// <summary>
    /// Verifica si un empleado tiene suficiente saldo para una solicitud.
    /// Usado en validaciones ANTES de crear la solicitud.
    /// </summary>
    public async Task<bool> HasSufficientBalanceAsync(int employeeId, int year, decimal requestedDays)
    {
        // Obtener o crear saldo (auto-creación si no existe)
        var balance = await GetOrCreateBalanceAsync(employeeId, year);
        
        if (balance == null) 
            return false;  // No hay política → no se puede solicitar

        // Comparar días disponibles vs solicitados
        return balance.RemainingDays >= requestedDays;
    }
}