using System.Diagnostics.CodeAnalysis;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusHR.Application.DTOs;
using NexusHR.Application.DTOs.TimeControl;
using NexusHR.Domain.Configuration;
using NexusHR.Domain.Constants;
using NexusHR.Domain.Entities;
using NexusHR.Infrastructure;
using NexusHR.Infrastructure.Services;


namespace NexusHR.Api.Controllers;

[ApiController]
[Route("api/time-entries")]
[Authorize] 
public class TimeEntriesController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly ITimeSummaryService _summaryService;
    private readonly IEmployeeAuthorizationService _authService;
    private readonly TimeTrackingOptions _timeOptions;
    private readonly IValidator<RegisterEntryDto> _entryValidator;

    public TimeEntriesController(
        AppDbContext db,
        ITimeSummaryService summaryService,
        IEmployeeAuthorizationService authService,
        IOptions<TimeTrackingOptions> timeOptions,
        IValidator<RegisterEntryDto> entryValidator)
    {
        _db = db;
        _summaryService = summaryService;
        _authService = authService;
        _timeOptions = timeOptions.Value;
        _entryValidator = entryValidator;
    }

    /// <summary>
    /// Registrar entrada (IN) o salida (OUT)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RegisterEntry([FromBody] RegisterEntryDto dto, CancellationToken cancellationToken)
    {
        var validationResult = await _entryValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
            return BadRequest(new { errors = validationResult.ToDictionary() });

        // Obtener userId del token JWT
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Obtener empleado del usuario
        var user = await _db.Users
            .Include(u => u.Employee)
            .ThenInclude(e => e!.Territory)
            .SingleOrDefaultAsync(u => u.UserId == userId.Value, cancellationToken);

        if (user?.Employee == null)
            return BadRequest(new { message = "Usuario sin empleado asignado" });

        var employeeId = user.Employee.EmployeeId;

        // Validar que el tipo sea IN, OUT, o vacío (para sincronización de terminal)
        if (!string.IsNullOrEmpty(dto.EntryType) && dto.EntryType != "IN" && dto.EntryType != "OUT")
            return BadRequest(new { message = "EntryType debe ser IN, OUT, o vacío" });

        // Hora actual en la zona horaria del territorio del empleado
        // Garantiza que un fichaje web de India se guarda en IST, no en hora del servidor
        var now = NexusHR.Infrastructure.Services.TimeZoneHelper.GetTerritoryNow(user.Employee.Territory);
        var today = now.Date;

        // Obtener último registro del día
        var lastEntry = await _db.TimeEntries
            .Where(e => e.EmployeeId == employeeId
                && e.Time != null
                && e.Time.Value.Date == today)
            .OrderByDescending(e => e.Time)
            .FirstOrDefaultAsync(cancellationToken);

        // Validar secuencia usando pair inference
        if (!string.IsNullOrEmpty(dto.EntryType) && lastEntry != null)
        {
            // Deducir si el anterior fue IN u OUT usando pair inference
            var allEntriesInDay = await _db.TimeEntries
                .Where(e => e.EmployeeId == employeeId
                    && e.Time != null
                    && e.Time.Value.Date == today)
                .OrderBy(e => e.Time)
                .ToListAsync(cancellationToken);

            int indexOfLast = allEntriesInDay.FindIndex(e => e.TimeEntryId == lastEntry.TimeEntryId);
            string lastInferredType = (indexOfLast >= 0 && indexOfLast % 2 == 0) ? "IN" : "OUT";

            // Si último tiene tipo explícito, usarlo. Si no, usar deducido
            string lastActualType = !string.IsNullOrEmpty(lastEntry.EntryType) ? lastEntry.EntryType : lastInferredType;
            
            // Validar que no sea el mismo tipo (debe alternar IN → OUT → IN)
            if (lastActualType == dto.EntryType)
            {
                var expected = lastActualType == "IN" ? "OUT" : "IN";
                return BadRequest(new { message = $"El último registro fue {lastActualType}. Se esperaba {expected}" });
            }
        }

        var entry = new TimeEntry
        {
            EmployeeId = employeeId,
            EntryType = dto.EntryType ?? string.Empty,
            EventTime = now,
            Time = now,
            Source = "WEB",
            Comment = dto.Comment,
            CreatedByUserId = userId.Value
        };

        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        // Recalcular resumen diario tras cada fichaje
        await _summaryService.CalculateDailySummaryAsync(employeeId, now.Date);

        return Ok(new
        {
            message = $"Fichaje {dto.EntryType} registrado correctamente",
            timeEntryId = entry.TimeEntryId,
            time = entry.Time?.ToUniversalTime()  // ✅ Convertir a UTC para que Frontend lo interprete correctamente
        });
    }


    /// <summary>
    /// Obtener fichajes de un empleado en un rango de fechas
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetEntries(
        [FromQuery] int? employeeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)

        {
        // Si no se especifica employeeId, usar el del usuario autenticado
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        int targetEmployeeId;

        if (employeeId.HasValue)
        {
            // Solo ADMIN y RRHH pueden ver fichajes de otros
            var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);
            
            if (!isAdminOrRrhh)
            {
                if(User.IsInRole(AppRoles.Manager))
                {
                    var managerUser = await _db.Users.SingleAsync(u => u.UserId == userId, cancellationToken);

                    if (!await _authService.IsManagerOfEmployeeAsync(managerUser.EmployeeId ?? 0, employeeId.Value))
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
            var user = await _db.Users.SingleAsync(u => u.UserId == userId.Value, cancellationToken);

            if (user.EmployeeId == null)
                return BadRequest(new { message = "Usuario sin empleado asignado" });

            targetEmployeeId = user.EmployeeId.Value;
        }

        var query = _db.TimeEntries
            .Include(e => e.Employee)
            .Where(e => e.EmployeeId == targetEmployeeId);

        if (from.HasValue)
            query = query.Where(e => e.Time >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.Time <= to.Value.AddDays(1).AddSeconds(-1));

        var entries = await query
            .OrderBy(e => e.Time)  // Ordenar ASC para pair inference
            .ToListAsync(cancellationToken);

        // Calcular tipo de fichaje usando pair inference
        var entriesWithType = new List<TimeEntryDto>();
        var entriesByDate = entries.GroupBy(e => e.Time!.Value.Date);

        foreach (var dateGroup in entriesByDate)
        {
            var dayEntries = dateGroup.OrderBy(e => e.Time).ToList();
            
            for (int i = 0; i < dayEntries.Count; i++)
            {
                var entry = dayEntries[i];
                // Pair inference: posición par (0,2,4...) = IN, impar (1,3,5...) = OUT
                var inferredType = (i % 2 == 0) ? "IN" : "OUT";
                // Usar EntryType si está definido, sino usar inferido
                var displayType = string.IsNullOrEmpty(entry.EntryType) ? inferredType : entry.EntryType;

                entriesWithType.Add(new TimeEntryDto
                {
                    TimeEntryId = entry.TimeEntryId,
                    EntryType = displayType,
                    EntryTypeSource = string.IsNullOrEmpty(entry.EntryType) ? "INFERRED" : "EXPLICIT",
                    Time = entry.Time?.ToUniversalTime(),  // ✅ Convertir a UTC para que Frontend lo interprete correctamente
                    Source = entry.Source,
                    DeviceId = entry.DeviceId,
                    Comment = entry.Comment,
                    EmployeeName = entry.Employee.FullName
                });
            }
        }

        // Ordenar DESC para mostrar últimos primero
        var result = entriesWithType.OrderByDescending(e => e.Time).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Obtener resumen diario de un empleado
    /// </summary>
    [HttpGet("summary/daily")]
    public async Task<IActionResult> GetDailySummary(
        [FromQuery] int? employeeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var userId = TryGetCurrentUserId();

        if (userId == null) return UnauthorizedUser();

        int targetEmployeeId;

        if (employeeId.HasValue)
        {
            var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);
            
            if (!isAdminOrRrhh)
            {
                if (User.IsInRole(AppRoles.Manager))
                {
                    var managerUser = await _db.Users.SingleAsync(u => u.UserId == userId.Value, cancellationToken);

                    if (!await _authService.IsManagerOfEmployeeAsync(managerUser.EmployeeId ?? 0, employeeId.Value))
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
            var user = await _db.Users.SingleAsync(u => u.UserId == userId.Value, cancellationToken);

            if (user.EmployeeId == null)
                return BadRequest(new { message = "Usuario sin empleado asignado" });

            targetEmployeeId = user.EmployeeId.Value;
        }

        var fromDate = from ?? DateTime.Now.AddDays(-_timeOptions.DefaultQueryRangeDays).Date;  // ✅ Hora local
        var toDate = to ?? DateTime.Now.Date;  // ✅ Hora local

        // Una sola llamada carga todos los días del rango en ~7 queries totales
        var rawSummaries = await _summaryService.CalculateRangeSummaryAsync(targetEmployeeId, fromDate, toDate);

        var summaries = rawSummaries.Select(summary => new TimeSummaryDto
        {
            Date = summary.Date,
            WorkedHours = Math.Round(summary.WorkedMinutes / 60.0, 2),
            ExpectedHours = Math.Round(summary.ExpectedMinutes / 60.0, 2),
            BalanceHours = Math.Round(summary.BalanceMinutes / 60.0, 2),
            IncidentType = summary.IncidentType,
            HasOpenEntry = summary.HasOpenEntry,
            ProposedCorrectionMinutes = summary.ExpectedMinutes
        }).ToList();

        return Ok(summaries);
    }

    /// <summary>
    /// Recalcular TimeDailySummaries para empleados con fichajes sin summary.
    /// Cubre fichajes insertados externamente (terminales físicos).
    /// </summary>
    [HttpPost("recalculate-summaries")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Rrhh}")]
    public async Task<IActionResult> RecalculateMissingSummaries([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
    {
        var fromDate = from?.Date ?? DateTime.Now.AddDays(-7).Date;
        var toDate = to?.Date ?? DateTime.Now.Date;

        // Buscar combinaciones (EmployeeId, Date) con fichajes pero SIN summary
        var entriesWithoutSummary = await _db.TimeEntries
            .Where(e => e.Time != null && e.Time.Value.Date >= fromDate && e.Time.Value.Date <= toDate)
            .Select(e => new { e.EmployeeId, Date = e.Time!.Value.Date })
            .Distinct()
            .ToListAsync(cancellationToken);

        var existingSummaries = await _db.TimeDailySummaries
            .Where(s => s.Date >= fromDate && s.Date <= toDate)
            .Select(s => new { s.EmployeeId, s.Date })
            .ToListAsync(cancellationToken);

        var existingSet = existingSummaries.ToHashSet();

        var missing = entriesWithoutSummary
            .Where(e => !existingSet.Contains(new { e.EmployeeId, e.Date }))
            .ToList();

        int calculated = 0;
        foreach (var m in missing)
        {
            await _summaryService.CalculateDailySummaryAsync(m.EmployeeId, m.Date);
            calculated++;
        }

        return Ok(new { message = $"Recalculados {calculated} resúmenes faltantes", from = fromDate, to = toDate, total = calculated });
    }
}