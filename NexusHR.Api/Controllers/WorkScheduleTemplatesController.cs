using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusHR.Application.DTOs;
using NexusHR.Domain.Entities;
using NexusHR.Infrastructure;
using NexusHR.Domain.Constants;

namespace NexusHR.Api.Controllers;

[ApiController]
[Route("api/schedule-templates")]
[Authorize]
[RequireRole(AppRoles.Admin, AppRoles.Rrhh)]
public class WorkScheduleTemplatesController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public WorkScheduleTemplatesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>
    /// Obtiene todas las templates (para admin)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllTemplates()
    {
        var templates = await _db.WorkScheduleTemplates
            .AsNoTracking()
            .Include(t => t.DayDetails)
            .OrderBy(t => t.IsDefault ? 0 : 1)
            .ThenBy(t => t.Name)
            .Select(t => new WorkScheduleTemplateDto
            {
                WorkScheduleTemplateId = t.WorkScheduleTemplateId,
                Name = t.Name,
                Description = t.Description,
                DayDetails = t.DayDetails.Select(d => new WorkScheduleDayDetailDto
                {
                    DayOfWeek = d.DayOfWeek,
                    IsWorkDay = d.IsWorkDay,
                    ExpectedStartTime = d.ExpectedStartTime,
                    ExpectedEndTime = d.ExpectedEndTime,
                    BreakMinutes = d.BreakMinutes
                }).ToList()
            })
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// Obtiene todas las templates de un territorio
    /// </summary>
    [HttpGet("by-territory/{territoryId}")]
    public async Task<IActionResult> GetTemplatesByTerritory(int territoryId)
    {
        var templates = await _db.WorkScheduleTemplates
            .AsNoTracking()
            .Include(t => t.DayDetails)
            .Where(t => t.TerritoryId == territoryId)
            .OrderBy(t => t.IsDefault ? 0 : 1)
            .ThenBy(t => t.Name)
            .Select(t => new WorkScheduleTemplateDto
            {
                WorkScheduleTemplateId = t.WorkScheduleTemplateId,
                Name = t.Name,
                Description = t.Description,
                DayDetails = t.DayDetails.Select(d => new WorkScheduleDayDetailDto
                {
                    DayOfWeek = d.DayOfWeek,
                    IsWorkDay = d.IsWorkDay,
                    ExpectedStartTime = d.ExpectedStartTime,
                    ExpectedEndTime = d.ExpectedEndTime,
                    BreakMinutes = d.BreakMinutes
                }).ToList()
            })
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// Obtiene detalle de una template específica
    /// </summary>
    [HttpGet("{templateId}")]
    public async Task<IActionResult> GetTemplate(int templateId)
    {
        var template = await _db.WorkScheduleTemplates
            .AsNoTracking()
            .Include(t => t.DayDetails)
            .FirstOrDefaultAsync(t => t.WorkScheduleTemplateId == templateId);

        if (template == null)
            return NotFound(new { message = "Template no encontrada" });

        var dto = new WorkScheduleTemplateDetailsDto
        {
            WorkScheduleTemplateId = template.WorkScheduleTemplateId,
            Name = template.Name,
            Description = template.Description,
            TerritoryId = template.TerritoryId,
            IsActive = template.IsActive,
            IsDefault = template.IsDefault,
            DayDetails = template.DayDetails.Select(d => new WorkScheduleDayDetailDto
            {
                DayOfWeek = d.DayOfWeek,
                IsWorkDay = d.IsWorkDay,
                ExpectedStartTime = d.ExpectedStartTime,
                ExpectedEndTime = d.ExpectedEndTime,
                BreakMinutes = d.BreakMinutes
            }).ToList()
        };

        return Ok(dto);
    }

    /// <summary>
    /// Crea una nueva template con sus daydetails
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateWorkScheduleTemplateDto dto)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Validar territorio existe
        var territory = await _db.Territories.FindAsync(dto.TerritoryId);
        if (territory == null)
            return NotFound(new { message = "Territorio no encontrado" });

        // Si es default, desactivar otros defaults del territorio
        if (dto.IsDefault ?? false)
        {
            var otherDefaults = await _db.WorkScheduleTemplates
                .Where(t => t.TerritoryId == dto.TerritoryId && t.IsDefault)
                .ToListAsync();

            foreach (var other in otherDefaults)
                other.IsDefault = false;
        }

        var template = new WorkScheduleTemplate
        {
            Name = dto.Name,
            Description = dto.Description,
            TerritoryId = dto.TerritoryId,
            IsActive = dto.IsActive ?? true,
            IsDefault = dto.IsDefault ?? false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Agregar daydetails
        if (dto.DayDetails != null && dto.DayDetails.Any())
        {
            foreach (var dayDto in dto.DayDetails)
            {
                template.DayDetails.Add(new WorkScheduleDayDetail
                {
                    DayOfWeek = dayDto.DayOfWeek,
                    IsWorkDay = dayDto.IsWorkDay,
                    ExpectedStartTime = dayDto.ExpectedStartTime,
                    ExpectedEndTime = dayDto.ExpectedEndTime,
                    BreakMinutes = dayDto.BreakMinutes
                });
            }
        }

        _db.WorkScheduleTemplates.Add(template);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkScheduleTemplate", template.WorkScheduleTemplateId, "CREATE", null, template, userId.Value);

        return CreatedAtAction(nameof(GetTemplate), new { templateId = template.WorkScheduleTemplateId }, 
            new { message = "Template creada", templateId = template.WorkScheduleTemplateId });
    }

    /// <summary>
    /// Actualiza una template existente
    /// </summary>
    [HttpPut("{templateId}")]
    public async Task<IActionResult> UpdateTemplate(int templateId, [FromBody] UpdateWorkScheduleTemplateDto dto)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        
        var template = await _db.WorkScheduleTemplates
            .Include(t => t.DayDetails)
            .FirstOrDefaultAsync(t => t.WorkScheduleTemplateId == templateId);

        if (template == null)
            return NotFound(new { message = "Template no encontrada" });

        var oldValue = new { template.Name, template.Description, template.IsActive, template.IsDefault };

        template.Name = dto.Name;
        template.Description = dto.Description;
        template.IsActive = dto.IsActive ?? template.IsActive;
        template.UpdatedAt = DateTime.UtcNow;

        // Si se marca como default, desactivar otros
        if (dto.IsDefault.HasValue && dto.IsDefault.Value && !template.IsDefault)
        {
            var otherDefaults = await _db.WorkScheduleTemplates
                .Where(t => t.TerritoryId == template.TerritoryId && t.IsDefault && t.WorkScheduleTemplateId != templateId)
                .ToListAsync();

            foreach (var other in otherDefaults)
                other.IsDefault = false;

            template.IsDefault = true;
        }

        // Actualizar daydetails si se envían
        if (dto.DayDetails != null && dto.DayDetails.Any())
        {
            _db.WorkScheduleDayDetails.RemoveRange(template.DayDetails);
            template.DayDetails.Clear();

            foreach (var dayDto in dto.DayDetails)
            {
                template.DayDetails.Add(new WorkScheduleDayDetail
                {
                    DayOfWeek = dayDto.DayOfWeek,
                    IsWorkDay = dayDto.IsWorkDay,
                    ExpectedStartTime = dayDto.ExpectedStartTime,
                    ExpectedEndTime = dayDto.ExpectedEndTime,
                    BreakMinutes = dayDto.BreakMinutes
                });
            }
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkScheduleTemplate", templateId, "UPDATE", oldValue,
            new { template.Name, template.Description, template.IsActive }, userId.Value);

        return Ok(new { message = "Template actualizada" });
    }

    /// <summary>
    /// Elimina una template (solo si no está asignada a empleados)
    /// </summary>
    [HttpDelete("{templateId}")]
    public async Task<IActionResult> DeleteTemplate(int templateId)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        var template = await _db.WorkScheduleTemplates
            .Include(t => t.DayDetails)
            .FirstOrDefaultAsync(t => t.WorkScheduleTemplateId == templateId);

        if (template == null)
            return NotFound(new { message = "Template no encontrada" });

        // Verificar que no está asignada a ningún empleado
        var assignmentCount = await _db.Employee_WorkSchedules
            .CountAsync(ews => ews.WorkScheduleTemplateId == templateId);

        if (assignmentCount > 0)
            return BadRequest(new { message = $"No se puede eliminar la template: tiene {assignmentCount} asignaciones activas" });

        _db.WorkScheduleDayDetails.RemoveRange(template.DayDetails);
        _db.WorkScheduleTemplates.Remove(template);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("WorkScheduleTemplate", templateId, "DELETE", template, null, userId.Value);

        return Ok(new { message = "Template eliminada" });
    }
}
