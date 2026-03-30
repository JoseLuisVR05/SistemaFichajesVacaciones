using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Application.DTOs;
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
            .Include(s => s.WorkScheduleTemplate)
            .ThenInclude(t => t!.DayDetails)
            .Where(s => s.EmployeeId == employeeId)
            .OrderByDescending(s => s.ValidFrom)
            .Select(s => new WorkScheduleDto
            {
                WorkScheduleId = s.WorkScheduleId,
                EmployeeId = s.EmployeeId,
                WorkScheduleTemplateId = s.WorkScheduleTemplateId ?? 0,
                ValidFrom = s.ValidFrom,
                ValidTo = s.ValidTo,
                Template = s.WorkScheduleTemplate == null ? null : new WorkScheduleTemplateDto
                {
                    WorkScheduleTemplateId = s.WorkScheduleTemplate.WorkScheduleTemplateId,
                    Name = s.WorkScheduleTemplate.Name,
                    Description = s.WorkScheduleTemplate.Description,
                    DayDetails = s.WorkScheduleTemplate.DayDetails.Select(d => new WorkScheduleDayDetailDto
                    {
                        DayOfWeek = d.DayOfWeek,
                        IsWorkDay = d.IsWorkDay,
                        ExpectedStartTime = d.ExpectedStartTime,
                        ExpectedEndTime = d.ExpectedEndTime,
                        BreakMinutes = d.BreakMinutes
                    }).ToList()
                },
                Notes = s.Notes
            })
            .ToListAsync();

        return Ok(schedules);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchedule([FromBody] ScheduleAssignmentDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);

        // Validate employee exists
        var employee = await _db.Employees.FindAsync(dto.EmployeeId);
        if (employee == null)
            return NotFound(new { message = "Empleado no encontrado" });

        // Validate WorkScheduleTemplate exists
        var template = await _db.WorkScheduleTemplates.FindAsync(dto.WorkScheduleTemplateId);
        if (template == null)
            return NotFound(new { message = "Plantilla de horario no encontrada" });

        var schedule = new Employee_WorkSchedule
        {
            EmployeeId            = dto.EmployeeId,
            WorkScheduleTemplateId = dto.WorkScheduleTemplateId,
            ValidFrom             = dto.ValidFrom,
            ValidTo               = dto.ValidTo,
            Notes                 = dto.Notes,
            CreatedAt             = DateTime.UtcNow,
            UpdatedAt             = DateTime.UtcNow
        };

        _db.Employee_WorkSchedules.Add(schedule);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", schedule.WorkScheduleId, "CREATE", null, schedule, userId);

        return Ok(new { message = "Asignación de horario creada", workScheduleId = schedule.WorkScheduleId });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] ScheduleAssignmentDto dto)
    {
        var userId   = int.Parse(User.FindFirst("userId")!.Value);
        var schedule = await _db.Employee_WorkSchedules.FindAsync(id);
        if (schedule == null) return NotFound(new { message = "Asignación de horario no encontrada" });

        // Validate WorkScheduleTemplate exists if changed
        if (dto.WorkScheduleTemplateId != schedule.WorkScheduleTemplateId)
        {
            var template = await _db.WorkScheduleTemplates.FindAsync(dto.WorkScheduleTemplateId);
            if (template == null)
                return NotFound(new { message = "Plantilla de horario no encontrada" });
        }

        var oldValue = new {
            schedule.WorkScheduleTemplateId,
            schedule.ValidFrom,
            schedule.ValidTo,
            schedule.Notes
        };

        schedule.WorkScheduleTemplateId = dto.WorkScheduleTemplateId;
        schedule.ValidFrom            = dto.ValidFrom;
        schedule.ValidTo              = dto.ValidTo;
        schedule.Notes                = dto.Notes;
        schedule.UpdatedAt            = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", id, "UPDATE", oldValue,
            new { schedule.WorkScheduleTemplateId, schedule.ValidFrom, schedule.ValidTo }, userId);

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

public record ScheduleAssignmentDto(
    int      EmployeeId,
    int      WorkScheduleTemplateId,
    DateTime ValidFrom,
    DateTime? ValidTo,
    string?  Notes
);