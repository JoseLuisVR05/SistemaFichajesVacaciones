using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;
using SistemaFichajesVacaciones.Application.Interfaces;
using SistemaFichajesVacaciones.Application.DTOs.Vacations;
using SistemaFichajesVacaciones.Domain.Constants;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/vacation/balance")]
[Authorize]
public class VacationBalanceController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly IVacationBalanceService _balanceService;
    private readonly IAuditService _audit;
    private readonly IEmployeeAuthorizationService _authService;

    public VacationBalanceController(
        AppDbContext db,
        IVacationBalanceService balanceService,
        IAuditService audit,
        IEmployeeAuthorizationService authService)
    {
        _db = db;
        _balanceService = balanceService;
        _audit = audit;
        _authService = authService;
    }

    /// <summary>
    /// Obtener saldo de vacaciones.
    /// - Sin parámetros: devuelve el saldo del usuario autenticado para el año actual.
    /// - Con employeeId: ADMIN/RRHH pueden consultar cualquier empleado, MANAGER solo sus subordinados.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetBalance(
        [FromQuery] int? employeeId,
        [FromQuery] int? year)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        
        var currentYear = year ?? DateTime.UtcNow.Year;

        int targetEmployeeId;

        if (employeeId.HasValue)
        {
            // Verificar permisos
            var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);

            if (!isAdminOrRrhh)
            {
                if (User.IsInRole(AppRoles.Manager))
                {
                    var managerUser = await _db.Users.SingleAsync(u => u.UserId == userId);
                    
                    if (!await _authService.IsManagerOfEmployeeAsync(managerUser.EmployeeId ?? 0, employeeId.Value))
                        return Forbid();
                }
                else
                {
                    // EMPLOYEE solo puede ver el propio
                    var user = await _db.Users.SingleAsync(u => u.UserId == userId);
                    if (user.EmployeeId != employeeId.Value)
                        return Forbid();
                }
            }

            targetEmployeeId = employeeId.Value;
        }
        else
        {
            // Sin employeeId: usar el del usuario autenticado
            var user = await _db.Users.SingleAsync(u => u.UserId == userId);
            if (user.EmployeeId == null)
                return BadRequest(new { message = "Usuario sin empleado asignado" });

            targetEmployeeId = user.EmployeeId.Value;
        }

        // Obtener o crear saldo
        var balance = await _balanceService.GetOrCreateBalanceAsync(targetEmployeeId, currentYear);

        if (balance == null)
            return NotFound(new
            {
                message = $"No hay política de vacaciones configurada para el año {currentYear}. " +
                          "Contacte con RRHH."
            });

        // Obtener nombre del empleado
        var employee = await _db.Employees.FindAsync(targetEmployeeId);

        return Ok(new
        {
            balance.BalanceId,
            balance.EmployeeId,
            employeeName = employee?.FullName,
            balance.Year,
            policyName = balance.Policy?.Name,
            balance.AllocatedDays,
            balance.UsedDays,
            balance.RemainingDays,
            balance.UpdatedAt
        });
    }

    /// <summary>
    /// Obtener saldos de todo un equipo (para managers) o de todos (ADMIN/RRHH)
    /// </summary>
    [HttpGet("team")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh, AppRoles.Manager)]
    public async Task<IActionResult> GetTeamBalances([FromQuery] int? year)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        var currentYear = year ?? DateTime.Now.Year;
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);

        // Determinar qué empleados incluir
        IQueryable<Domain.Entities.Employee> employeesQuery = _db.Employees.Where(e => e.IsActive);

        if (!isAdminOrRrhh && User.IsInRole(AppRoles.Manager))
        {
            // Solo subordinados del manager
            employeesQuery = employeesQuery
                .Where(e => e.ManagerEmployeeId == user.EmployeeId);
        }

        var employees = await employeesQuery
            .OrderBy(e => e.FullName)
            .ToListAsync();

        var result = new List<object>();

        foreach (var emp in employees)
        {
            var balance = await _balanceService.GetOrCreateBalanceAsync(emp.EmployeeId, currentYear);

            result.Add(new
            {
                emp.EmployeeId,
                emp.EmployeeCode,
                emp.FullName,
                emp.Department,
                year = currentYear,
                allocatedDays = balance?.AllocatedDays ?? 0,
                usedDays = balance?.UsedDays ?? 0,
                remainingDays = balance?.RemainingDays ?? 0,
                policyName = balance?.Policy?.Name ?? "Sin política"
            });
        }

        return Ok(result);
    }

    /// <summary>
    /// Asignar saldos masivamente a todos los empleados activos (ADMIN/RRHH)
    /// </summary>
    [HttpPost("bulk-assign")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh)]
    public async Task<IActionResult> BulkAssign([FromBody] BulkAssignBalanceDto dto)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Validar que la política existe
        var policy = await _db.VacationPolicies.FindAsync(dto.PolicyId);
        if (policy == null)
            return NotFound(new { message = "Política no encontrada" });

        try
        {
            var result = await _balanceService.BulkAssignBalancesAsync(
                dto.PolicyId, dto.Year, userId.Value);

            await _audit.LogAsync("VacationBalance", 0, "BULK_ASSIGN",
                null,
                new { dto.PolicyId, dto.Year, result.Created, result.Skipped },
                userId.Value);

            return Ok(new
            {
                message = $"Asignación masiva completada",
                created = result.Created,
                skipped = result.Skipped,
                totalEmployees = result.Total
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Recalcular saldo de un empleado (ADMIN/RRHH)
    /// Útil si se detectan inconsistencias
    /// </summary>
    [HttpPost("recalculate")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh)]
    public async Task<IActionResult> Recalculate(
        [FromQuery] int employeeId,
        [FromQuery] int? year)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        var currentYear = year ?? DateTime.Now.Year;

        var balance = await _balanceService.RecalculateBalanceAsync(employeeId, currentYear);

        if (balance == null)
            return NotFound(new { message = "No se encontró saldo para recalcular" });

        await _audit.LogAsync("VacationBalance", balance.BalanceId, "RECALCULATE",
            null,
            new { balance.AllocatedDays, balance.UsedDays, balance.RemainingDays },
            userId.Value);

        return Ok(new
        {
            message = "Saldo recalculado",
            balance.AllocatedDays,
            balance.UsedDays,
            balance.RemainingDays
        });
    }
}
