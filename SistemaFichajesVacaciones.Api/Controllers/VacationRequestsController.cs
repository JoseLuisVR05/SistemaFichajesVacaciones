using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;
using SistemaFichajesVacaciones.Application.DTOs.Vacations;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/vacation/requests")]
[Authorize]
public class VacationRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IVacationRequestService _requestService;
    private readonly IVacationBalanceService _balanceService;
    private readonly IAuditService _audit;

    public VacationRequestsController(
        AppDbContext db,
        IVacationRequestService requestService,
        IVacationBalanceService balanceService,
        IAuditService audit)
    {
        _db = db;
        _requestService = requestService;
        _balanceService = balanceService;
        _audit = audit;
    }

    /// <summary>
    /// Crea una solicitud de vacaciones en estado DRAFT
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateVacationRequestDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        if (user.EmployeeId == null)
            return BadRequest(new { message = "Usuario sin empleado asignado" });

        // Validar fechas y saldo
        var validation = await _requestService.ValidateRequestAsync(
            user.EmployeeId.Value,
            dto.StartDate,
            dto.EndDate
        );

        if (!validation.IsValid)
        {
            return BadRequest(new
            {
                message = "Validación fallida",
                errors = validation.Errors,
                warnings = validation.Warnings
            });
        }

        // Crear solicitud
        var request = new VacationRequests
        {
            EmployeeId = user.EmployeeId.Value,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            RequestedDays = validation.WorkingDays,
            Type = dto.Type ?? "VACATION",
            Status = "DRAFT",
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _db.VacationRequests.Add(request);
        await _db.SaveChangesAsync();

        // Generar días desglosados
        var requestDays = await _requestService.GenerateRequestDaysAsync(
            request.RequestId,
            dto.StartDate,
            dto.EndDate
        );

        _db.AddRange(requestDays);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("VacationRequests", request.RequestId, "CREATE", null, request, userId);

        return Ok(new
        {
            message = "Solicitud creada en borrador",
            requestId = request.RequestId,
            requestedDays = request.RequestedDays,
            warnings = validation.Warnings
        });
    }

    /// <summary>
    /// Envía una solicitud para aprobación
    /// </summary>
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitRequest(int id)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        // Verificar permisos: solo el dueño puede enviar
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);
        if (request.EmployeeId != user.EmployeeId)
            return Forbid();

        if (request.Status != "DRAFT")
            return BadRequest(new { message = "Solo se pueden enviar solicitudes en borrador" });

        // Re-validar por si cambió algo
        var validation = await _requestService.ValidateRequestAsync(
            request.EmployeeId,
            request.StartDate,
            request.EndDate,
            request.RequestId
        );

        if (!validation.IsValid)
        {
            return BadRequest(new
            {
                message = "La solicitud ya no es válida",
                errors = validation.Errors
            });
        }

        var oldValue = new { request.Status };

        request.Status = "SUBMITTED";
        request.SubmittedAt = DateTime.Now;
        request.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequests", id, "SUBMIT", oldValue, new { request.Status }, userId);

        return Ok(new { message = "Solicitud enviada para aprobación" });
    }

    /// <summary>
    /// Aprueba una solicitud (solo MANAGER, RRHH, ADMIN)
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireRole("ADMIN", "RRHH", "MANAGER")]
    public async Task<IActionResult> ApproveRequest(int id, [FromBody] ApproveRejectRequestDto? dto = null)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        if (request.Status != "SUBMITTED")
            return BadRequest(new { message = "Solo se pueden aprobar solicitudes enviadas" });

        // Verificar permisos: Manager solo puede aprobar de sus subordinados
        if (User.IsInRole("MANAGER") && !User.IsInRole("ADMIN") && !User.IsInRole("RRHH"))
        {
            var manager = await _db.Users.SingleAsync(u => u.UserId == userId);
            if (request.Employee.ManagerEmployeeId != manager.EmployeeId)
                return Forbid();
        }

        var oldValue = new { request.Status };

        request.Status = "APPROVED";
        request.ApproverEmployeeId = (await _db.Users.SingleAsync(u => u.UserId == userId)).EmployeeId;
        request.ApproverComment = dto?.Comment;
        request.DecisionAt = DateTime.Now;
        request.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();

        // Actualizar saldo del empleado
        await _balanceService.RecalculateBalanceAsync(request.EmployeeId, request.StartDate.Year);

        // Sincronizar calendario de ausencias
        await _requestService.SyncAbsenceCalendarAsync(request.RequestId);

        await _audit.LogAsync("VacationRequests", id, "APPROVE", oldValue, new { request.Status }, userId);

        return Ok(new { message = "Solicitud aprobada correctamente" });
    }

    /// <summary>
    /// Rechaza una solicitud (solo MANAGER, RRHH, ADMIN)
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireRole("ADMIN", "RRHH", "MANAGER")]
    public async Task<IActionResult> RejectRequest(int id, [FromBody] ApproveRejectRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Comment))
            return BadRequest(new { message = "El motivo del rechazo es obligatorio" });

        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        if (request.Status != "SUBMITTED")
            return BadRequest(new { message = "Solo se pueden rechazar solicitudes enviadas" });

        // Verificar permisos
        if (User.IsInRole("MANAGER") && !User.IsInRole("ADMIN") && !User.IsInRole("RRHH"))
        {
            var manager = await _db.Users.SingleAsync(u => u.UserId == userId);
            if (request.Employee.ManagerEmployeeId != manager.EmployeeId)
                return Forbid();
        }

        var oldValue = new { request.Status };

        request.Status = "REJECTED";
        request.ApproverEmployeeId = (await _db.Users.SingleAsync(u => u.UserId == userId)).EmployeeId;
        request.ApproverComment = dto.Comment;
        request.DecisionAt = DateTime.Now;
        request.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequests", id, "REJECT", oldValue, new { request.Status }, userId);

        return Ok(new { message = "Solicitud rechazada" });
    }

    /// Cancela una solicitud propia (solo si está en DRAFT o SUBMITTED)
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelRequest(int id)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        var request = await _db.VacationRequests
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        // Solo el dueño puede cancelar
        if (request.EmployeeId != user.EmployeeId)
            return Forbid();

        if (request.Status == "APPROVED")
            return BadRequest(new { message = "No se puede cancelar una solicitud ya aprobada. Contacte a RRHH." });

        if (request.Status == "CANCELLED")
            return BadRequest(new { message = "La solicitud ya está cancelada" });

        var oldValue = new { request.Status };

        request.Status = "CANCELLED";
        request.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequests", id, "CANCEL", oldValue, new { request.Status }, userId);

        return Ok(new { message = "Solicitud cancelada" });
    }

    /// <summary>
    /// Lista solicitudes: propias o de equipo según rol
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetRequests(
        [FromQuery] int? employeeId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
        var isManager = User.IsInRole("MANAGER");

        IQueryable<VacationRequests> query = _db.VacationRequests
            .Include(r => r.Employee);

        // Filtrar según permisos
        if (employeeId.HasValue)
        {
            if (!isAdminOrRrhh)
            {
                if (isManager)
                {
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    if (!subordinateIds.Contains(employeeId.Value) && employeeId.Value != user.EmployeeId)
                        return Forbid();
                }
                else if (employeeId.Value != user.EmployeeId)
                {
                    return Forbid();
                }
            }

            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }
        else
        {
            // Sin employeeId: mostrar según rol
            if (isAdminOrRrhh)
            {
                // ADMIN/RRHH ven todo
            }
            else if (isManager && user.EmployeeId.HasValue)
            {
                // MANAGER ve sus subordinados + propias
                var subordinateIds = await _db.Employees
                    .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                    .Select(e => e.EmployeeId)
                    .ToListAsync();

                var allIds = subordinateIds.Concat(new[] { user.EmployeeId.Value }).ToList();
                query = query.Where(r => allIds.Contains(r.EmployeeId));
            }
            else
            {
                // EMPLOYEE solo ve las propias
                if (user.EmployeeId == null)
                    return BadRequest(new { message = "Usuario sin empleado asignado" });

                query = query.Where(r => r.EmployeeId == user.EmployeeId.Value);
            }
        }

        // Filtros adicionales
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status.ToUpper());
        if (from.HasValue)
            query = query.Where(r => r.StartDate >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(r => r.EndDate <= to.Value.Date);

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.RequestId,
                r.EmployeeId,
                employeeName = r.Employee.FullName,
                r.StartDate,
                r.EndDate,
                r.RequestedDays,
                r.Type,
                r.Status,
                r.ApproverComment,
                r.SubmittedAt,
                r.DecisionAt,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>
    /// Valida un rango de fechas sin crear la solicitud (preview)
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateDates([FromBody] ValidateVacationDatesDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);

        if (user.EmployeeId == null)
            return BadRequest(new { message = "Usuario sin empleado asignado" });

        var validation = await _requestService.ValidateRequestAsync(
            user.EmployeeId.Value,
            dto.StartDate,
            dto.EndDate
        );

        return Ok(new
        {
            isValid = validation.IsValid,
            workingDays = validation.WorkingDays,
            availableDays = validation.AvailableDays,
            errors = validation.Errors,
            warnings = validation.Warnings
        });
    }
}
