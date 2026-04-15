using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusHR.Application.DTOs;
using NexusHR.Infrastructure;

namespace NexusHR.Api.Controllers;

[ApiController]
[Route("api/calendar-templates")]
[Authorize]
public class CalendarTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CalendarTemplatesController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Obtener calendarios disponibles para un territorio
    /// Incluye todos los días del año con festivos y fines de semana
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCalendarTemplates([FromQuery] int? territoryId, [FromQuery] int? year)
    {
        var targetYear = year ?? DateTime.Now.Year;
        
        var query = _db.CalendarTemplates
            .Include(c => c.CalendarDays)
            .Where(c => c.IsActive);

        if (territoryId.HasValue)
            query = query.Where(c => c.TerritoryId == territoryId);

        var templates = await query
            .Select(c => new CalendarTemplateDto
            {
                CalendarTemplateId = c.CalendarTemplateId,
                Level = c.Level,
                IsDefault = c.IsDefault,
                IsActive = c.IsActive,
                Days = c.CalendarDays
                    .OrderBy(d => d.Date)
                    .Select(d => new CalendarDayDto
                    {
                        Date = d.Date,
                        IsWeekend = d.IsWeekend,
                        IsHoliday = d.IsHoliday,
                        HolidayName = d.HolidayName
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// Obtener un calendario específico por ID
    /// Retorna todos los días del año configurado
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCalendarTemplate(int id)
    {
        var template = await _db.CalendarTemplates
            .Include(c => c.CalendarDays)
            .FirstOrDefaultAsync(c => c.CalendarTemplateId == id);

        if (template == null)
            return NotFound(new { message = "Calendario no encontrado" });

        var result = new CalendarTemplateDto
        {
            CalendarTemplateId = template.CalendarTemplateId,
            Level = template.Level,
            IsDefault = template.IsDefault,
            IsActive = template.IsActive,
            Days = template.CalendarDays
                .OrderBy(d => d.Date)
                .Select(d => new CalendarDayDto
                {
                    Date = d.Date,
                    IsWeekend = d.IsWeekend,
                    IsHoliday = d.IsHoliday,
                    HolidayName = d.HolidayName
                })
                .ToList()
        };

        return Ok(result);
    }

    /// <summary>
    /// Obtener solo los días de un calendar dentro de un rango de fechas
    /// Útil para filtrar festivos de un período específico
    /// </summary>
    [HttpGet("{id}/days")]
    public async Task<IActionResult> GetCalendarDays(
        [FromRoute] int id,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var template = await _db.CalendarTemplates
            .Include(c => c.CalendarDays)
            .FirstOrDefaultAsync(c => c.CalendarTemplateId == id);

        if (template == null)
            return NotFound(new { message = "Calendario no encontrado" });

        var days = template.CalendarDays
            .Where(d => d.Date >= from.Date && d.Date <= to.Date)
            .OrderBy(d => d.Date)
            .Select(d => new CalendarDayDto
            {
                Date = d.Date,
                IsWeekend = d.IsWeekend,
                IsHoliday = d.IsHoliday,
                HolidayName = d.HolidayName
            })
            .ToList();

        return Ok(days);
    }

    /// <summary>
    /// Obtener el calendario por defecto para un territorio
    /// Si no específica territorio, usa el actual del empleado
    /// </summary>
    [HttpGet("default")]
    public async Task<IActionResult> GetDefaultCalendar([FromQuery] int? territoryId)
    {
        int targetTerritoryId = territoryId ?? 0;

        var template = await _db.CalendarTemplates
            .Include(c => c.CalendarDays)
            .FirstOrDefaultAsync(c => c.IsDefault && c.IsActive && c.TerritoryId == targetTerritoryId);

        if (template == null)
        {
            // Si no encuentra, retorna el nacional por defecto
            template = await _db.CalendarTemplates
                .Include(c => c.CalendarDays)
                .FirstOrDefaultAsync(c => c.IsDefault && c.IsActive && c.Level == "NATIONAL");

            if (template == null)
                return NotFound(new { message = "Ningún calendario por defecto disponible" });
        }

        var result = new CalendarTemplateDto
        {
            CalendarTemplateId = template.CalendarTemplateId,
            Level = template.Level,
            IsDefault = template.IsDefault,
            IsActive = template.IsActive,
            Days = template.CalendarDays
                .OrderBy(d => d.Date)
                .Select(d => new CalendarDayDto
                {
                    Date = d.Date,
                    IsWeekend = d.IsWeekend,
                    IsHoliday = d.IsHoliday,
                    HolidayName = d.HolidayName
                })
                .ToList()
        };

        return Ok(result);
    }
}
