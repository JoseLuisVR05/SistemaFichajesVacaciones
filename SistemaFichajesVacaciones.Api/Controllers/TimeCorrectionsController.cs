using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;
using System.Security.Claims;

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
        if (dto.Date > DateTime.Now.Date)
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
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
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
        correction.ApprovedAt = DateTime.Now;
        correction.UpdatedAt = DateTime.Now;

        // Actualizar resumen diario
        var summary = await _db.TimeDailySummaries
            .SingleOrDefaultAsync(s => s.EmployeeId == correction.EmployeeId && s.Date == correction.Date);

        if (summary != null)
        {
            summary.WorkedMinutes = correction.CorrectedMinutes;
            summary.LastCalculatedAt = DateTime.Now;
        }
        else
        {
            summary = new TimeDailySummary
            {
                EmployeeId = correction.EmployeeId,
                Date = correction.Date,
                WorkedMinutes = correction.CorrectedMinutes,
                ExpectedMinutes = 480,
                LastCalculatedAt = DateTime.Now
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
        correction.ApprovedAt = DateTime.Now;
        correction.Reason += $"\n[RECHAZO]: {dto.RejectionReason}";
        correction.UpdatedAt = DateTime.Now;

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
        [FromQuery] DateTime? to)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        IQueryable<TimeCorrection> query = _db.TimeCorrections
            .Include(tc => tc.Employee);

        if (employeeId.HasValue)
        {
            // Solo admin/rrhh pueden ver de cualquier empleado
            if (!User.IsInRole("ADMIN") && !User.IsInRole("RRHH"))
            {
                // Manager puede ver de sus subordinados
                if (User.IsInRole("MANAGER"))
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
                    return Forbid();
                }
            }

            query = query.Where(tc => tc.EmployeeId == employeeId.Value);
        }
        else
        {
           // Sin employeeId especificado
            if (User.IsInRole("ADMIN") || User.IsInRole("RRHH"))
            {
                // Admin/RRHH ven todas las correcciones
                // No filtrar por empleado
            }
            else if (User.IsInRole("MANAGER") && user.EmployeeId.HasValue)
            {
                // Manager ve las correcciones de sus subordinados
                var subordinateIds = await _db.Employees
                    .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                    .Select(e => e.EmployeeId)
                    .ToListAsync();
        
                query = query.Where(tc => subordinateIds.Contains(tc.EmployeeId));
            }
            else
            {
                // Usuario normal solo ve las propias
                if (user.EmployeeId == null)
                    return BadRequest(new { message = "Usuario sin empleado asignado" });

                query = query.Where(tc => tc.EmployeeId == user.EmployeeId.Value);
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
}

public record CreateCorrectionDto(DateTime Date, int CorrectedMinutes, string Reason);
public record RejectCorrectionDto(string RejectionReason);