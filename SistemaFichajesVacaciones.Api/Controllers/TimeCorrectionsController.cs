using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;

// Api/Controllers/TimeCorrectionsController.cs
[ApiController]
[Route("api/time-corrections")]
[Authorize]
public class TimeCorrectionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly ITimeSummaryService _summaryService;

    public TimeCorrectionsController(AppDbContext db, IAuditService audit, ITimeSummaryService summaryService)
    {
        _db = db;
        _audit = audit;
        _summaryService = summaryService;
    }

    /// <summary>
    /// Solicitar corrección de tiempo trabajado
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RequestCorrection([FromBody] CreateCorrectionDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.Include(u => u.Employee).SingleAsync(u => u.UserId == userId);
        
        if (user.EmployeeId == null)
            return BadRequest(new { message = "Usuario sin empleado asignado" });

        // Validar fecha no futura
        if (dto.Date > DateTime.UtcNow.Date)
            return BadRequest(new { message = "No se puede corregir una fecha futura" });

        // Validar que no exista corrección pendiente para esa fecha
        var existingPending = await _db.TimeCorrections
            .AnyAsync(tc => tc.EmployeeId == user.EmployeeId.Value 
                         && tc.Date == dto.Date 
                         && tc.Status == "PENDING");
        
        if (existingPending)
            return BadRequest(new { message = "Ya existe una corrección pendiente para esta fecha" });

        // Obtener minutos originales del resumen
        var summary = await _db.TimeDailySummaries
            .SingleOrDefaultAsync(s => s.EmployeeId == user.EmployeeId.Value && s.Date == dto.Date);

        var correction = new TimeCorrection
        {
            EmployeeId = user.EmployeeId.Value,
            Date = dto.Date,
            OriginalMinutes = summary?.WorkedMinutes ?? 0,
            CorrectedMinutes = dto.CorrectedMinutes,
            Reason = dto.Reason,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.TimeCorrections.Add(correction);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("TimeCorrection", correction.CorrectionId, "CREATE", null, correction, userId);

        return Ok(new { message = "Solicitud de corrección creada", correctionId = correction.CorrectionId });
    }

    /// <summary>
    /// Aprobar corrección (solo ADMIN, RRHH, MANAGER)
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireRole("ADMIN", "RRHH", "MANAGER")]
    public async Task<IActionResult> ApproveCorrection(int id)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var correction = await _db.TimeCorrections
            .Include(tc => tc.Employee)
            .SingleOrDefaultAsync(tc => tc.CorrectionId == id);

        if (correction == null)
            return NotFound(new { message = "Corrección no encontrada" });

        if (correction.Status != "PENDING")
            return BadRequest(new { message = "La corrección ya fue procesada" });

        // Si es MANAGER, verificar que sea el manager del empleado
        if (User.IsInRole("MANAGER") && !User.IsInRole("ADMIN") && !User.IsInRole("RRHH"))
        {
            var managerEmployeeId = await _db.Users
                .Where(u => u.UserId == userId)
                .Select(u => u.EmployeeId)
                .SingleOrDefaultAsync();

            if (correction.Employee.ManagerEmployeeId != managerEmployeeId)
                return Forbid();
        }

        var oldValue = new { correction.Status };
        
        correction.Status = "APPROVED";
        correction.ApprovedByUserId = userId;
        correction.ApprovedAt = DateTime.UtcNow;
        correction.UpdatedAt = DateTime.UtcNow;

        // Actualizar resumen diario
        var summary = await _db.TimeDailySummaries
            .SingleOrDefaultAsync(s => s.EmployeeId == correction.EmployeeId && s.Date == correction.Date);

        if (summary != null)
        {
            summary.WorkedMinutes = correction.CorrectedMinutes;
            summary.LastCalculatedAt = DateTime.UtcNow;
        }
        else
        {
            summary = new TimeDailySummary
            {
                EmployeeId = correction.EmployeeId,
                Date = correction.Date,
                WorkedMinutes = correction.CorrectedMinutes,
                ExpectedMinutes = 480,
                LastCalculatedAt = DateTime.UtcNow
            };

            _db.TimeDailySummaries.Add(summary);
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync("TimeCorrection", id, "UPDATE", oldValue, new { correction.Status }, userId);

        return Ok(new { message = "Corrección aprobada" });
    }

    /// <summary>
    /// Rechazar corrección
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireRole("ADMIN", "RRHH", "MANAGER")]
    public async Task<IActionResult> RejectCorrection(int id, [FromBody] RejectCorrectionDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var correction = await _db.TimeCorrections
            .Include(tc => tc.Employee)
            .SingleOrDefaultAsync(tc => tc.CorrectionId == id);

        if (correction == null)
            return NotFound();

        if (correction.Status != "PENDING")
            return BadRequest(new { message = "La corrección ya fue procesada" });

        // Verificar permisos igual que en approve
        if (User.IsInRole("MANAGER") && !User.IsInRole("ADMIN") && !User.IsInRole("RRHH"))
        {
            var managerEmployeeId = await _db.Users
                .Where(u => u.UserId == userId)
                .Select(u => u.EmployeeId)
                .SingleOrDefaultAsync();

            if (correction.Employee.ManagerEmployeeId != managerEmployeeId)
            
                return Forbid();
        }

        var oldValue = new { correction.Status };
        
        correction.Status = "REJECTED";
        correction.ApprovedByUserId = userId;
        correction.ApprovedAt = DateTime.UtcNow;
        correction.Reason += $"\n[RECHAZO]: {dto.RejectionReason}";
        correction.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("TimeCorrection", id, "UPDATE", oldValue, new { correction.Status }, userId);

        return Ok(new { message = "Corrección rechazada" });
    }

    /// <summary>
    /// Listar correcciones (propias o de equipo si es manager/admin)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCorrections(
        [FromQuery] int? employeeId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool includeOwn = false)
        
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
        var isManager = User.IsInRole("MANAGER");

        IQueryable<TimeCorrection> query = _db.TimeCorrections
            .Include(tc => tc.Employee);

        if (employeeId.HasValue)
        {
            // Solo admin/rrhh pueden ver de cualquier empleado
            if (!isAdminOrRrhh)
            {
                // Manager puede ver de sus subordinados
                if (isManager)
                {
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    if (!subordinateIds.Contains(employeeId.Value))
                        return Forbid();
                }
                else
                {
                    if(employeeId.Value !=user.EmployeeId)
                        return Forbid();
                }
            }

            query = query.Where(tc => tc.EmployeeId == employeeId.Value);
        }
        else
        {
           // Sin employeeId especificado
            if (includeOwn)
            {
                if (user.EmployeeId == null)
                    return BadRequest(new { message = "Usuario sin empleado asignado" });
                    
                query = query.Where(tc => tc.EmployeeId == user.EmployeeId.Value);
            }

            else
            {
                if (isAdminOrRrhh)
                {
                    
                }
                else if(isManager && user.EmployeeId.HasValue)
                {
                    // Manager ve las correcciones de sus subordinados (sin incluir las propias)
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    query = query.Where(tc => subordinateIds.Contains(tc.EmployeeId));
                }
                else
                {
                    if (user.EmployeeId == null)
                    return BadRequest(new { message = "Usuario sin empleado asignado" });

                query = query.Where(tc => tc.EmployeeId == user.EmployeeId.Value);
                }
            }
        }

        if (!string.IsNullOrEmpty(status))
            query = query.Where(tc => tc.Status == status.ToUpper());
        if (from.HasValue)
            query = query.Where(tc => tc.Date >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(tc => tc.Date <= to.Value.Date);

        var corrections = await query
            .OrderByDescending(tc => tc.CreatedAt)
            .Select(tc => new
            {
                tc.CorrectionId,
                tc.EmployeeId,
                employeeName = tc.Employee.FullName,
                tc.Date,
                tc.OriginalMinutes,
                tc.CorrectedMinutes,
                tc.Reason,
                tc.Status,
                tc.CreatedAt,
                tc.ApprovedAt
            })

            .ToListAsync();

        return Ok(corrections);
    }

    // ─── AÑADIR en TimeCorrectionsController ─────────────────────────────

    /// <summary>
    /// Editar corrección propia pendiente (solo el empleado dueño)
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCorrection(int id, [FromBody] UpdateCorrectionDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user   = await _db.Users.SingleAsync(u => u.UserId == userId);

        var correction = await _db.TimeCorrections
            .SingleOrDefaultAsync(tc => tc.CorrectionId == id);

        if (correction == null)
            return NotFound(new { message = "Corrección no encontrada" });

        // Solo el empleado dueño puede editar
        if (correction.EmployeeId != user.EmployeeId)
            return Forbid();

        if (correction.Status != "PENDING")
            return BadRequest(new { message = "Solo se pueden editar correcciones pendientes" });

        var oldValue = new { correction.CorrectedMinutes, correction.Reason };

        correction.CorrectedMinutes = dto.CorrectedMinutes;
        correction.Reason           = dto.Reason;
        correction.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("TimeCorrection", id, "UPDATE",
            oldValue,
            new { correction.CorrectedMinutes, correction.Reason },
            userId);

        return Ok(new { message = "Corrección actualizada" });
    }

    /// <summary>
    /// Cancelar (eliminar) corrección propia pendiente (solo el empleado dueño)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCorrection(int id)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user   = await _db.Users.SingleAsync(u => u.UserId == userId);

        var correction = await _db.TimeCorrections
            .SingleOrDefaultAsync(tc => tc.CorrectionId == id);

        if (correction == null)
            return NotFound(new { message = "Corrección no encontrada" });

        if (correction.EmployeeId != user.EmployeeId)
            return Forbid();

        if (correction.Status != "PENDING")
            return BadRequest(new { message = "Solo se pueden cancelar correcciones pendientes" });

        _db.TimeCorrections.Remove(correction);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("TimeCorrection", id, "DELETE", correction, null, userId);

        return Ok(new { message = "Corrección cancelada y eliminada" });
    }

}
public record UpdateCorrectionDto(int CorrectedMinutes, string Reason);
public record CreateCorrectionDto(DateTime Date, int CorrectedMinutes, string Reason);
public record RejectCorrectionDto(string RejectionReason);