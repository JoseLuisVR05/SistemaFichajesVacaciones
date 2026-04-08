using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using SistemaFichajesVacaciones.Application.DTOs;
using SistemaFichajesVacaciones.Domain.Constants;


namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : BaseApiController // Controlador para devolver respuestas como ok(), notfound, badrequest, etc.
{
    private readonly AppDbContext _context;
    private readonly IEmployeeImportService _importService;
    private readonly IEmployeeAuthorizationService _authService;

    public EmployeesController(AppDbContext context, IEmployeeImportService importService, IEmployeeAuthorizationService authService)
    {
        _context = context;
        _importService = importService;
        _authService = authService;
    }

    [HttpGet]
        public async Task<IActionResult> GetAll()
        {
           var userId = TryGetCurrentUserId();

            if (userId == null) return UnauthorizedUser();

            var user = await _context.Users.SingleAsync(u => u.UserId == userId.Value);

            IQueryable<Employee> query = _context.Employees.Where(e => e.IsActive);

            //  ADMIN y RRHH ven todos
            var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);
    
            if (!isAdminOrRrhh)
            {
                // MANAGER solo ve sus subordinados
                if (User.IsInRole(AppRoles.Manager))
                {
                    query = query.Where(e => e.ManagerEmployeeId == user.EmployeeId);
                }
                else
                {
                    // EMPLOYEE no puede ver la página de empleados
                    return Forbid();
                }
            }

    var employees = await query
        .OrderBy(e => e.EmployeeCode)
        .ToListAsync();

    // ⚡ OPTIMIZACIÓN: Cargar TODOS los datos de horarios de una sola vez
    var today = DateTime.UtcNow.Date;
    var employeeIds = employees.Select(e => e.EmployeeId).ToList();

    // Cargar TODOS los Employee_WorkSchedules activos en una query
    var employeeSchedules = await _context.Employee_WorkSchedules
        .AsNoTracking()
        .Where(ews => employeeIds.Contains(ews.EmployeeId) && 
                      ews.ValidFrom <= today && 
                      (ews.ValidTo == null || ews.ValidTo >= today))
        .Include(ews => ews.WorkScheduleTemplate)
        .ThenInclude(wst => wst.DayDetails)
        .ToListAsync();

    // Cargar TODOS los WorkScheduleTemplates DEFAULT en una query
    var territories = employees.Where(e => e.TerritoryId.HasValue)
        .Select(e => e.TerritoryId.Value)
        .Distinct()
        .ToList();

    var defaultTemplates = await _context.WorkScheduleTemplates
        .AsNoTracking()
        .Where(wst => territories.Contains(wst.TerritoryId) && 
                      wst.IsDefault && 
                      wst.IsActive)
        .Include(wst => wst.DayDetails)
        .ToListAsync();

    // Crear diccionarios para búsqueda rápida O(1) en memoria
    var schedulesByEmployeeId = employeeSchedules
        .GroupBy(ews => ews.EmployeeId)
        .ToDictionary(g => g.Key, g => g.First());

    var defaultsByTerritory = defaultTemplates
        .GroupBy(wst => wst.TerritoryId)
        .ToDictionary(g => g.Key, g => g.First());

    // Enriquecer empleados SIN queries adicionales
    var result = employees.Select(emp => new EmployeeWithScheduleDto
    {
        EmployeeId = emp.EmployeeId,
        EmployeeCode = emp.EmployeeCode,
        FullName = emp.FullName,
        TerritoryId = emp.TerritoryId,
        Department = emp.Department,
        Company = emp.Company,
        IsActive = emp.IsActive,
        WorkSchedule = GetScheduleFromCache(emp, schedulesByEmployeeId, defaultsByTerritory)
    }).ToList();

    return Ok(result);
}

/// <summary>/// Busca empleados por nombre, email o ID (para búsqueda rápida en asignación de horarios)
/// </summary>
[HttpGet("search")]
public async Task<IActionResult> SearchEmployees([FromQuery] string term)
{
    if (string.IsNullOrWhiteSpace(term) || term.Length < 2)
        return Ok(new List<object>());

    var userId = TryGetCurrentUserId();
    if (userId == null) return UnauthorizedUser();

    var user = await _context.Users.SingleAsync(u => u.UserId == userId.Value);
    var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);

    IQueryable<Employee> query = _context.Employees.Where(e => e.IsActive);

    if (!isAdminOrRrhh)
    {
        if (User.IsInRole(AppRoles.Manager))
        {
            query = query.Where(e => e.ManagerEmployeeId == user.EmployeeId);
        }
        else
        {
            return Forbid();
        }
    }

    var searchLower = term.ToLower();
    
    // Buscar por nombre, email o ID
    var employees = await query
        .Where(e => 
            e.FullName.ToLower().Contains(searchLower) ||
            e.Email.ToLower().Contains(searchLower) ||
            e.EmployeeId.ToString().Contains(term))
        .Take(20) // Límite para performance
        .ToListAsync();

    var today = DateTime.UtcNow.Date;
    var employeeIds = employees.Select(e => e.EmployeeId).ToList();

    // Cargar horarios de estos empleados solamente
    var employeeSchedules = await _context.Employee_WorkSchedules
        .AsNoTracking()
        .Where(ews => employeeIds.Contains(ews.EmployeeId) && 
                      ews.ValidFrom <= today && 
                      (ews.ValidTo == null || ews.ValidTo >= today))
        .Include(ews => ews.WorkScheduleTemplate)
        .ThenInclude(wst => wst.DayDetails)
        .ToListAsync();

    // Cargar DEFAULT del territorio para estos empleados
    var territories = employees.Where(e => e.TerritoryId.HasValue)
        .Select(e => e.TerritoryId.Value)
        .Distinct()
        .ToList();

    var defaultTemplates = await _context.WorkScheduleTemplates
        .AsNoTracking()
        .Where(wst => territories.Contains(wst.TerritoryId) && 
                      wst.IsDefault && 
                      wst.IsActive)
        .Include(wst => wst.DayDetails)
        .ToListAsync();

    var schedulesByEmployeeId = employeeSchedules
        .GroupBy(ews => ews.EmployeeId)
        .ToDictionary(g => g.Key, g => g.First());

    var defaultsByTerritory = defaultTemplates
        .GroupBy(wst => wst.TerritoryId)
        .ToDictionary(g => g.Key, g => g.First());

    var result = employees.Select(emp => new EmployeeWithScheduleDto
    {
        EmployeeId = emp.EmployeeId,
        EmployeeCode = emp.EmployeeCode,
        FullName = emp.FullName,
        TerritoryId = emp.TerritoryId,
        Department = emp.Department,
        Company = emp.Company,
        IsActive = emp.IsActive,
        Email = emp.Email,
        WorkSchedule = GetScheduleFromCache(emp, schedulesByEmployeeId, defaultsByTerritory)
    }).ToList();

    return Ok(result);
}

/// <summary>/// Obtiene el horario desde los diccionarios cacheados (búsqueda O(1), SIN queries).
/// </summary>
private WorkScheduleInfoDto? GetScheduleFromCache(
    Employee employee,
    Dictionary<int, Employee_WorkSchedule> schedulesByEmployeeId,
    Dictionary<int, WorkScheduleTemplate> defaultsByTerritory)
{
    if (!employee.TerritoryId.HasValue)
        return null;

    // 1. Buscar excepción del empleado en el diccionario
    if (schedulesByEmployeeId.TryGetValue(employee.EmployeeId, out var employeeSchedule))
    {
        return BuildWorkScheduleInfoDto(employeeSchedule.WorkScheduleTemplate, isException: true, workScheduleId: employeeSchedule.WorkScheduleId);
    }

    // 2. Buscar DEFAULT del territorio en el diccionario
    if (defaultsByTerritory.TryGetValue(employee.TerritoryId.Value, out var defaultTemplate))
    {
        return BuildWorkScheduleInfoDto(defaultTemplate, isException: false, workScheduleId: null);
    }

    return null;
}

/// <summary>
/// Construye un DTO con información del horario a partir de un WorkScheduleTemplate.
/// Extrae horas del primer día de la semana que sea día laboral.
/// </summary>
private WorkScheduleInfoDto BuildWorkScheduleInfoDto(WorkScheduleTemplate? template, bool isException, int? workScheduleId = null)
{
    var hours = "---";

    if (template != null)
    {
        // Obtener horas del primer día laboral (ej: Lunes)
        if (template.DayDetails?.Any() == true)
        {
            var firstWorkDay = template.DayDetails.FirstOrDefault(d => d.IsWorkDay);
            if (firstWorkDay != null)
            {
                var startTime = firstWorkDay.ExpectedStartTime?.ToString("HH:mm") ?? "00:00";
                var endTime = firstWorkDay.ExpectedEndTime?.ToString("HH:mm") ?? "00:00";
                hours = $"{startTime}-{endTime}";
            }
        }
    }

    return new WorkScheduleInfoDto
    {
        WorkScheduleId = workScheduleId,
        WorkScheduleTemplateId = template?.WorkScheduleTemplateId ?? 0,
        Name = template?.Name ?? "No asignado",
        Description = template?.Description,
        Hours = hours,
        IsException = isException,
        IsDefault = !isException
    };
}
    [HttpGet("{id}")]
        public async Task<ActionResult<EmployeeWithScheduleDto>> GetEmployee(int id)
        {
            // Extramos el usuario actual para verificar permisos
            // y asi nadie ve el perfil de otro adivinando su ID

            var userId = TryGetCurrentUserId();
            if(userId == null)
                return Unauthorized(new { message = "Token inválido o claim ausente" });
            
            var requistingUser = await _context.Users
                .AsNoTracking()
                .SingleOrDefaultAsync( u => u.UserId ==userId.Value);

            if(requistingUser == null) return Unauthorized();

            var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);

            // ADMIN Y RRHH pueden ver cualquier empleado
            if(!isAdminOrRrhh)
            {
                if(User.IsInRole(AppRoles.Manager))
                {
                    //MANAGER solo puede ver sus subordinador directos
                    var isSubordinate =  await _authService.IsManagerOfEmployeeAsync(requistingUser.EmployeeId ?? 0, id);
                    
                    // un MANAGER tambien puede ver su propio perfil
                    var isSelf = requistingUser.EmployeeId == id;

                    if(!isSubordinate && !isSelf)
                    return Forbid();
                }
                else
                {
                    // EMPLOYEE solo puede ver su propio perfil
                    if (requistingUser.EmployeeId != id)
                    return Forbid();    
                }
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e=> e.EmployeeId == id);

            if (employee == null)
                return NotFound(new { message = "Empleado no encontrado"});

            // Cargar horario vigente del empleado (si existe)
            var today = DateTime.UtcNow.Date;
            var employeeSchedule = await _context.Employee_WorkSchedules
                .AsNoTracking()
                .Where(ews => ews.EmployeeId == id &&
                              ews.ValidFrom <= today &&
                              (ews.ValidTo == null || ews.ValidTo >= today))
                .Include(ews => ews.WorkScheduleTemplate)
                .ThenInclude(wst => wst.DayDetails)
                .FirstOrDefaultAsync();

            // Cargar horario DEFAULT del territorio si no tiene excepción
            WorkScheduleTemplate? defaultTemplate = null;
            if (employeeSchedule == null && employee.TerritoryId.HasValue)
            {
                defaultTemplate = await _context.WorkScheduleTemplates
                    .AsNoTracking()
                    .Include(wst => wst.DayDetails)
                    .FirstOrDefaultAsync(wst => 
                        wst.TerritoryId == employee.TerritoryId
                        && wst.IsDefault == true
                        && wst.IsActive == true);
            }

            // Construir DTO
            var scheduleTemplate = employeeSchedule?.WorkScheduleTemplate ?? defaultTemplate;
            var workSchedule = scheduleTemplate != null
                ? BuildWorkScheduleInfoDto(scheduleTemplate, isException: employeeSchedule != null, workScheduleId: employeeSchedule?.WorkScheduleId)
                : null;

            var result = new EmployeeWithScheduleDto
            {
                EmployeeId = employee.EmployeeId,
                EmployeeCode = employee.EmployeeCode,
                FullName = employee.FullName,
                TerritoryId = employee.TerritoryId,
                Department = employee.Department,
                Company = employee.Company,
                IsActive = employee.IsActive,
                WorkSchedule = workSchedule
            };

            return Ok(result);
        }

    // ─── AÑADIR en EmployeesController, después de GetEmployee ───────────
    [HttpPatch("{id}/toggle-active")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh)]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            return NotFound(new { message = "Empleado no encontrado" });

        employee.IsActive  = !employee.IsActive;
        employee.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            isActive = employee.IsActive
        });
    }

    [HttpPost("import")]
        public async Task<IActionResult> ImportEmployees(IFormFile file)
        {
            if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo vacío" });

            try
            {
                var result = await _importService.ImportFromCsvAsync(file);
                return Ok(new { message = "Importación finalizada", importRunId = result.ImportRunId, total = result.TotalRows, errors = result.ErrorRows });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error en la importación", detail = ex.Message });
            }
        }
    
}

