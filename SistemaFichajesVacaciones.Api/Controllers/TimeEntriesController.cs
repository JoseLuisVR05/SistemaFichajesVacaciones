using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;


namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/time-entries")]
[Authorize] 
public class TimeEntriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITimeSummaryService _summaryService;
    public TimeEntriesController(AppDbContext db, ITimeSummaryService summaryService)
    {
        _db = db;
        _summaryService = summaryService;
    }

    /// <summary>
    /// Registrar entrada (IN) o salida (OUT)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RegisterEntry([FromBody] RegisterEntryDto dto)
    {
        // Obtener userId del token JWT
        var userIdClaim = User.FindFirst("userId")?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Token inválido" });

        // Obtener empleado del usuario
        var user = await _db.Users
            .Include(u => u.Employee)
            .SingleOrDefaultAsync(u => u.UserId == userId);

        if (user?.Employee == null)
            return BadRequest(new { message = "Usuario sin empleado asignado" });

        var employeeId = user.Employee.EmployeeId;

        // Validar que el tipo sea IN o OUT
        if (dto.EntryType != "IN" && dto.EntryType != "OUT")
            return BadRequest(new { message = "EntryType debe ser IN o OUT" });

        // Obtener último registro del día
        var today = DateTime.UtcNow.Date;
        var lastEntry = await _db.TimeEntries
            .Where(e => e.EmployeeId == employeeId && e.EventTime.Date == today)
            .OrderByDescending(e => e.EventTime)
            .FirstOrDefaultAsync();

        // Validar secuencia IN -> OUT -> IN -> OUT
        if (lastEntry != null && lastEntry.EntryType == dto.EntryType)
        {
            var expected = lastEntry.EntryType == "IN" ? "OUT" : "IN";
            return BadRequest(new { message = $"El último registro fue {lastEntry.EntryType}. Se esperaba {expected}" });
        }

        var entry = new TimeEntry
        {
            EmployeeId = employeeId,
            EntryType = dto.EntryType,
            EventTime = DateTime.UtcNow,
            Source = "WEB",
            Comment = dto.Comment,
            CreatedByUserId = userId
        };

        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Fichaje {dto.EntryType} registrado correctamente",
            timeEntryId = entry.TimeEntryId,
            eventTime = entry.EventTime
        });
    }

    /// <summary>
    /// Obtener fichajes de un empleado en un rango de fechas
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetEntries(
        [FromQuery] int? employeeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)

        {
        // Si no se especifica employeeId, usar el del usuario autenticado
        var userIdClaim = User.FindFirst("userId")?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        int targetEmployeeId;

        if (employeeId.HasValue)
        {
            // Solo ADMIN y RRHH pueden ver fichajes de otros
            var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
            
            if (!isAdminOrRrhh)
            {
                if(User.IsInRole("MANAGER"))
                {
                    var managerUser = await _db.Users.SingleAsync(u => u.UserId == userId);
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == managerUser.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    if(!subordinateIds.Contains(employeeId.Value))

                        return Forbid();
                }
                else
                {
                    return Forbid();
                }
            }

            targetEmployeeId = employeeId.Value;
        }
        else
        {
            var user = await _db.Users.SingleAsync(u => u.UserId == userId);

            if (user.EmployeeId == null)

                return BadRequest(new { message = "Usuario sin empleado asignado" });

            targetEmployeeId = user.EmployeeId.Value;
        }

        var query = _db.TimeEntries
            .Where(e => e.EmployeeId == targetEmployeeId);

        if (from.HasValue)
            query = query.Where(e => e.EventTime >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.EventTime <= to.Value.AddDays(1).AddSeconds(-1));

        var entries = await query
            .OrderByDescending(e => e.EventTime)
            .Select(e => new
            {
                e.TimeEntryId,
                e.EntryType,
                e.EventTime,
                e.Source,
                e.Comment,
                EmployeeName = e.Employee.FullName
               
            })

            .ToListAsync();

        return Ok(entries);
    }

    /// <summary>
    /// Obtener resumen diario de un empleado
    /// </summary>
    [HttpGet("summary/daily")]
    public async Task<IActionResult> GetDailySummary(
        [FromQuery] int? employeeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userIdClaim = User.FindFirst("userId")?.Value;

        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))

            return Unauthorized();

        int targetEmployeeId;

        if (employeeId.HasValue)
        {
            var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
            
            if (!isAdminOrRrhh)
            {
                if (User.IsInRole("MANAGER"))
                {
                    var managerUser = await _db.Users.SingleAsync(u => u.UserId == userId);
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == managerUser.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    if (!subordinateIds.Contains(employeeId.Value))
                        return Forbid();
                }
                else
                {
                    return Forbid();
                }
            }
            
            targetEmployeeId = employeeId.Value;
        }
        else
        {
            var user = await _db.Users.SingleAsync(u => u.UserId == userId);

            if (user.EmployeeId == null)

                return BadRequest(new { message = "Usuario sin empleado asignado" });

            targetEmployeeId = user.EmployeeId.Value;
        }

        var fromDate = from ?? DateTime.UtcNow.AddDays(-30).Date;
        var toDate = to ?? DateTime.UtcNow.Date;

        // Calcular resúmenes para cada día del rango
        var summaries = new List<object>();

        for (var d = fromDate; d <= toDate; d = d.AddDays(1))
        {
            var summary = await _summaryService.CalculateDailySummaryAsync(targetEmployeeId, d);

            if(summary != null)
            {
                summaries.Add(new
                {
                    date = summary.Date,
                    workedHours = Math.Round(summary.WorkedMinutes / 60.0, 2),
                    expectedHours = Math.Round(summary.ExpectedMinutes / 60.0, 2),
                    balanceHours = Math.Round(summary.BalanceMinutes / 60.0, 2),
                    incidentType = summary.IncidentType,
                    hasOpenEntry = summary.HasOpenEntry,
                    proposedCorrectionMinutes = summary.ExpectedMinutes
                });
            }
            else
            {
                summaries.Add(new
                {
                    date = d,
                    workedHours = 0.0,
                    expectedHours = 0.0,
                    balanceHours = 0.0
                });
            }
        }
        
        return Ok(summaries);
    }

public record RegisterEntryDto(string EntryType, string? Comment);
}