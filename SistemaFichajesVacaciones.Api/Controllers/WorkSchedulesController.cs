using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize]
[RequireRole("ADMIN", "RRHH")]
public class WorkSchedulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public WorkSchedulesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetSchedules([FromQuery] int employeeId)
    {
        var schedules = await _db.Employee_WorkSchedules
            .Where(s => s.EmployeeId == employeeId)
            .OrderByDescending(s => s.ValidFrom)
            .Select(s => new {
                s.WorkScheduleId,
                s.EmployeeId,
                s.ValidFrom,
                s.ValidTo,
                expectedStartTime = s.ExpectedStartTime.ToString(@"hh\:mm"),
                expectedEndTime   = s.ExpectedEndTime.ToString(@"hh\:mm"),
                s.BreakMinutes,
                s.Notes
            })
            .ToListAsync();

        return Ok(schedules);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchedule([FromBody] ScheduleDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);

        if (!TimeSpan.TryParse(dto.ExpectedStartTime, out var start) ||
            !TimeSpan.TryParse(dto.ExpectedEndTime, out var end))
            return BadRequest(new { message = "Formato de hora inválido. Use HH:mm" });

        var schedule = new Employee_WorkSchedule
        {
            EmployeeId        = dto.EmployeeId,
            ValidFrom         = dto.ValidFrom,
            ValidTo           = dto.ValidTo,
            ExpectedStartTime = start,
            ExpectedEndTime   = end,
            BreakMinutes      = dto.BreakMinutes,
            Notes             = dto.Notes,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow
        };

        _db.Employee_WorkSchedules.Add(schedule);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", schedule.WorkScheduleId, "CREATE", null, schedule, userId);

        return Ok(new { message = "Horario creado", workScheduleId = schedule.WorkScheduleId });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] ScheduleDto dto)
    {
        var userId   = int.Parse(User.FindFirst("userId")!.Value);
        var schedule = await _db.Employee_WorkSchedules.FindAsync(id);
        if (schedule == null) return NotFound(new { message = "Horario no encontrado" });

        if (!TimeSpan.TryParse(dto.ExpectedStartTime, out var start) ||
            !TimeSpan.TryParse(dto.ExpectedEndTime, out var end))
            return BadRequest(new { message = "Formato de hora inválido. Use HH:mm" });

        var oldValue = new {
            schedule.ValidFrom, schedule.ValidTo,
            schedule.ExpectedStartTime, schedule.ExpectedEndTime, schedule.BreakMinutes
        };

        schedule.ValidFrom         = dto.ValidFrom;
        schedule.ValidTo           = dto.ValidTo;
        schedule.ExpectedStartTime = start;
        schedule.ExpectedEndTime   = end;
        schedule.BreakMinutes      = dto.BreakMinutes;
        schedule.Notes             = dto.Notes;
        schedule.UpdatedAt         = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", id, "UPDATE", oldValue,
            new { schedule.ValidFrom, schedule.ValidTo }, userId);

        return Ok(new { message = "Horario actualizado" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var userId   = int.Parse(User.FindFirst("userId")!.Value);
        var schedule = await _db.Employee_WorkSchedules.FindAsync(id);
        if (schedule == null) return NotFound(new { message = "Horario no encontrado" });

        _db.Employee_WorkSchedules.Remove(schedule);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", id, "DELETE", schedule, null, userId);

        return Ok(new { message = "Horario eliminado" });
    }
}

public record ScheduleDto(
    int      EmployeeId,
    DateTime ValidFrom,
    DateTime? ValidTo,
    string   ExpectedStartTime,
    string   ExpectedEndTime,
    int      BreakMinutes,
    string?  Notes
);