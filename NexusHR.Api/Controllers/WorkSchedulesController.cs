using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusHR.Application.DTOs;
using NexusHR.Application.DTOs.TimeControl;
using NexusHR.Domain.Constants;
using NexusHR.Domain.Entities;
using NexusHR.Infrastructure;

namespace NexusHR.Api.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize]
[RequireRole(AppRoles.Admin, AppRoles.Rrhh)]
public class WorkSchedulesController : BaseApiController
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
        // Validar que el empleado existe
        var employee = await _db.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            return NotFound(new { message = "Empleado no encontrado" });

        var today = DateTime.UtcNow.Date;

        // 1. Buscar horarios asignados al empleado (excepciones)
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
                IsDefault = false,
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

        // 2. Si NO tiene excepciones y tiene TerritoryId, agregar el DEFAULT del territorio
        if (schedules.Count == 0 && employee.TerritoryId.HasValue)
        {
            var defaultTemplate = await _db.WorkScheduleTemplates
                .AsNoTracking()
                .Include(t => t.DayDetails)
                .FirstOrDefaultAsync(t => 
                    t.TerritoryId == employee.TerritoryId
                    && t.IsDefault == true
                    && t.IsActive == true);

            if (defaultTemplate != null)
            {
                var defaultScheduleDto = new WorkScheduleDto
                {
                    WorkScheduleId = 0,
                    EmployeeId = employeeId,
                    WorkScheduleTemplateId = defaultTemplate.WorkScheduleTemplateId,
                    ValidFrom = today,
                    ValidTo = null,
                    IsDefault = true,
                    Template = new WorkScheduleTemplateDto
                    {
                        WorkScheduleTemplateId = defaultTemplate.WorkScheduleTemplateId,
                        Name = defaultTemplate.Name,
                        Description = defaultTemplate.Description,
                        DayDetails = defaultTemplate.DayDetails.Select(d => new WorkScheduleDayDetailDto
                        {
                            DayOfWeek = d.DayOfWeek,
                            IsWorkDay = d.IsWorkDay,
                            ExpectedStartTime = d.ExpectedStartTime,
                            ExpectedEndTime = d.ExpectedEndTime,
                            BreakMinutes = d.BreakMinutes
                        }).ToList()
                    },
                    Notes = "Horario por defecto del territorio"
                };

                schedules.Add(defaultScheduleDto);
            }
        }

        return Ok(schedules);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchedule([FromBody] ScheduleAssignmentDto dto)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
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
        await _audit.LogAsync("WorkSchedule", schedule.WorkScheduleId, "CREATE", null, schedule, userId.Value);

        return Ok(new { message = "Asignación de horario creada", workScheduleId = schedule.WorkScheduleId });
    }

    /// <summary>
    /// Asigna una template a un empleado de forma simple (desde hoy indefinidamente)
    /// Reemplaza cualquier asignación anterior
    /// </summary>
    [HttpPost("assign")]
    public async Task<IActionResult> AssignTemplateToEmployee([FromBody] AssignTemplateToEmployeeDto dto)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Validar empleado existe
        var employee = await _db.Employees.FindAsync(dto.EmployeeId);
        if (employee == null)
            return NotFound(new { message = "Empleado no encontrado" });

        // Validar template existe
        var template = await _db.WorkScheduleTemplates.FindAsync(dto.WorkScheduleTemplateId);
        if (template == null)
            return NotFound(new { message = "Plantilla de horario no encontrada" });

        var today = DateTime.UtcNow.Date;

        // Buscar si ya tiene una asignación vigente
        var existingSchedule = await _db.Employee_WorkSchedules
            .FirstOrDefaultAsync(ews => 
                ews.EmployeeId == dto.EmployeeId &&
                ews.ValidFrom <= today &&
                (ews.ValidTo == null || ews.ValidTo >= today));

        if (existingSchedule != null)
        {
            // Actualizar asignación existente
            existingSchedule.WorkScheduleTemplateId = dto.WorkScheduleTemplateId;
            existingSchedule.ValidTo = dto.ValidTo; // null = indefinido
            existingSchedule.UpdatedAt = DateTime.UtcNow;
            
            await _db.SaveChangesAsync();
            await _audit.LogAsync("WorkSchedule", existingSchedule.WorkScheduleId, "UPDATE", 
                new { previousTemplateId = existingSchedule.WorkScheduleTemplateId },
                new { newTemplateId = dto.WorkScheduleTemplateId }, userId.Value);
        }
        else
        {
            // Crear nueva asignación
            var schedule = new Employee_WorkSchedule
            {
                EmployeeId = dto.EmployeeId,
                WorkScheduleTemplateId = dto.WorkScheduleTemplateId,
                ValidFrom = today,
                ValidTo = dto.ValidTo, // null = indefinido
                Notes = $"Asignado automáticamente desde {today:yyyy-MM-dd}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Employee_WorkSchedules.Add(schedule);
            await _db.SaveChangesAsync();
            await _audit.LogAsync("WorkSchedule", schedule.WorkScheduleId, "CREATE", null, schedule, userId.Value);
        }

        return Ok(new { message = "Template asignada al empleado" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] ScheduleAssignmentDto dto)
    {
        var userId   = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
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
            new { schedule.WorkScheduleTemplateId, schedule.ValidFrom, schedule.ValidTo }, userId.Value);

        return Ok(new { message = "Horario actualizado" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var userId   = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        var schedule = await _db.Employee_WorkSchedules.FindAsync(id);
        if (schedule == null) return NotFound(new { message = "Horario no encontrado" });

        _db.Employee_WorkSchedules.Remove(schedule);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkSchedule", id, "DELETE", schedule, null, userId.Value);

        return Ok(new { message = "Horario eliminado" });
    }
}

