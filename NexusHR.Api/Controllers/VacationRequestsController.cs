using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusHR.Application.DTOs.Vacations;
using NexusHR.Application.Interfaces;
using NexusHR.Domain.Constants;
using NexusHR.Domain.Entities;
using NexusHR.Infrastructure;
using NexusHR.Infrastructure.Services;

namespace NexusHR.Api.Controllers;

[ApiController]
[Route("api/vacation/requests")]
[Authorize]
public class VacationRequestsController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly IVacationRequestService _requestService;
    private readonly IVacationBalanceService _balanceService;
    private readonly IAuditService _audit;
    private readonly IEmployeeAuthorizationService _authService;
    private readonly IValidator<CreateVacationRequestDto> _createValidator;

    public VacationRequestsController(
        AppDbContext db,
        IVacationRequestService requestService,
        IVacationBalanceService balanceService,
        IAuditService audit,
        IEmployeeAuthorizationService authService,
        IValidator<CreateVacationRequestDto> createValidator)
    {
        _db = db;
        _requestService = requestService;
        _balanceService = balanceService;
        _audit = audit;
        _authService = authService;
        _createValidator = createValidator;
    }

    /// <summary>
    /// Crea una solicitud de vacaciones en estado DRAFT
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateVacationRequestDto dto)
    {
        var validationResult = await _createValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
            return BadRequest(new { errors = validationResult.ToDictionary() });

        var (userId, employeeId, error) = await GetCurrentEmployeeAsync(_db);
        if (error != null) return error;

        // Validar fechas y saldo
        var validation = await _requestService.ValidateRequestAsync(
            employeeId,
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
            EmployeeId = employeeId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            RequestedDays = validation.WorkingDays,
            Type = dto.Type ?? "VACATION",
            Status = VacationStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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

        await _audit.LogAsync("VacationRequest", request.RequestId, "CREATE",
        null,
        new
            {
                request.StartDate,
                request.EndDate,
                request.RequestedDays,
                request.Type,
                request.Status
            },
            userId);

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
        var (userId, employeeId, error) = await GetCurrentEmployeeAsync(_db);
        if (error != null) return error;

        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        // Verificar permisos: solo el dueño puede enviar
        if (request.EmployeeId != employeeId)
            return Forbid();

        if (request.Status != VacationStatus.Draft)
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

        request.Status = VacationStatus.Submitted;
        request.SubmittedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequest", id, "SUBMIT",
        oldValue,
        new { request.Status, request.SubmittedAt },
        userId);

        return Ok(new { message = "Solicitud enviada para aprobación" });
    }

    /// <summary>
    /// Aprueba una solicitud (solo MANAGER, RRHH, ADMIN)
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh, AppRoles.Manager)]
    public async Task<IActionResult> ApproveRequest(int id, [FromBody] ApproveRejectRequestDto? dto = null)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Una sola query para obtener el EmployeeId del aprobador, reutilizada abajo
        var approver = await _db.Users
            .Where(u => u.UserId == userId.Value)
            .Select(u => new { u.EmployeeId })
            .SingleOrDefaultAsync();

        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        if (request.Status != VacationStatus.Submitted)
            return BadRequest(new { message = "Solo se pueden aprobar solicitudes enviadas" });

        // Verificar permisos: Manager solo puede aprobar de sus subordinados
        if (User.IsInRole(AppRoles.Manager) && !User.IsInRole(AppRoles.Admin) && !User.IsInRole(AppRoles.Rrhh))
        {
            if (!await _authService.IsManagerOfEmployeeAsync(approver?.EmployeeId ?? 0, request.EmployeeId))
                return Forbid();
        }

        var oldValue = new { request.Status };

        request.Status = VacationStatus.Approved;
        request.ApproverEmployeeId = approver?.EmployeeId; // reutilizamos la query de arriba
        request.ApproverComment = dto?.Comment;
        request.DecisionAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Actualizar saldo del empleado
        await _balanceService.RecalculateBalanceAsync(request.EmployeeId, request.StartDate.Year);

        // Sincronizar calendario de ausencias
        await _requestService.SyncAbsenceCalendarAsync(request.RequestId);

        await _audit.LogAsync("VacationRequest", id, "APPROVE",
            oldValue,
            new
            {
                request.Status,
                request.ApproverComment,
                request.DecisionAt
            },
            userId.Value);

        return Ok(new { message = "Solicitud aprobada correctamente" });
    }

    /// <summary>
    /// Rechaza una solicitud (solo MANAGER, RRHH, ADMIN)
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireRole(AppRoles.Admin, AppRoles.Rrhh, AppRoles.Manager)]
    public async Task<IActionResult> RejectRequest(int id, [FromBody] ApproveRejectRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Comment))
            return BadRequest(new { message = "El motivo del rechazo es obligatorio" });

        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();

        // Una sola query para obtener el EmployeeId del aprobador, reutilizada abajo
        var approver = await _db.Users
            .Where(u => u.UserId == userId.Value)
            .Select(u => new { u.EmployeeId })
            .SingleOrDefaultAsync();

        var request = await _db.VacationRequests
            .Include(r => r.Employee)
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        if (request.Status != VacationStatus.Submitted)
            return BadRequest(new { message = "Solo se pueden rechazar solicitudes enviadas" });

        // Verificar permisos
        if (User.IsInRole(AppRoles.Manager) && !User.IsInRole(AppRoles.Admin) && !User.IsInRole(AppRoles.Rrhh))
        {
            if (!await _authService.IsManagerOfEmployeeAsync(approver?.EmployeeId ?? 0, request.EmployeeId))
                return Forbid();
        }

        var oldValue = new { request.Status };

        request.Status = VacationStatus.Rejected;
        request.ApproverEmployeeId = approver?.EmployeeId; // reutilizamos la query de arriba
        request.ApproverComment = dto.Comment;
        request.DecisionAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequest", id, "REJECT",
            oldValue,
            new
            {
                request.Status,
                request.ApproverComment,
                request.DecisionAt
            },
            userId.Value);

        return Ok(new { message = "Solicitud rechazada" });
    }
    /// <summary>
    /// Cancela una solicitud propia (solo si está en DRAFT o SUBMITTED)
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelRequest(int id)
    {
        var (userId, employeeId, error) = await GetCurrentEmployeeAsync(_db);
        if (error != null) return error;

        var request = await _db.VacationRequests
            .SingleOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound(new { message = "Solicitud no encontrada" });

        // Solo el dueño puede cancelar
        if (request.EmployeeId != employeeId)
            return Forbid();

        if (request.Status == VacationStatus.Approved)
            return BadRequest(new { message = "No se puede cancelar una solicitud ya aprobada. Contacte a RRHH." });

        if (request.Status == VacationStatus.Cancelled)
            return BadRequest(new { message = "La solicitud ya está cancelada" });

        var oldValue = new { request.Status };

        request.Status = VacationStatus.Cancelled;
        request.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("VacationRequest", id, "CANCEL",
            oldValue,
            new { request.Status, CancelledAt = DateTime.UtcNow },
            userId);

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
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        // Limitar pageSize para evitar que alguien pida 100.000 registros de golpe
        if (pageSize > 100) pageSize = 100;
        if (page < 1) page = 1;
        var userId = TryGetCurrentUserId();
        if (userId == null) return UnauthorizedUser();
        var user = await _db.Users.SingleAsync(u => u.UserId == userId.Value);

        var isAdminOrRrhh = User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Rrhh);
        var isManager = User.IsInRole(AppRoles.Manager);

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
        {
            var statusUpper = status.ToUpper();
            var validStatuses = new[]
            {
                VacationStatus.Draft, VacationStatus.Submitted, VacationStatus.Approved,
                VacationStatus.Rejected, VacationStatus.Cancelled
            };

            if (!validStatuses.Contains(statusUpper))
                return BadRequest(new
                {
                    message = $"Estado no válido. Valores permitidos: {string.Join(", ", validStatuses)}"
                });

            query = query.Where(r => r.Status == statusUpper);
        }
        if (from.HasValue)
            query = query.Where(r => r.StartDate >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(r => r.EndDate <= to.Value.Date);

        // Contar el total ANTES de paginar (EF Core lo traduce a SELECT COUNT(*))
        var totalCount = await query.CountAsync();

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)  // saltamos los registros de páginas anteriores
            .Take(pageSize)               // tomamos solo los de esta página
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

        return Ok(new
        {
            data = requests,
            page,
            pageSize,
            totalCount,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }

    /// <summary>
    /// Valida un rango de fechas sin crear la solicitud 
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateDates([FromBody] ValidateVacationDatesDto dto)
    {
        var (_, employeeId, error) = await GetCurrentEmployeeAsync(_db);
        if (error != null) return error;

        var validation = await _requestService.ValidateRequestAsync(
            employeeId,
            dto.StartDate,
            dto.EndDate
        );

        return Ok(new
        {
            isValid = validation.IsValid,
            workingDays = validation.WorkingDays,
            availableDays = validation.AvailableDays,
            errors = validation.Errors,
            warnings = validation.Warnings,
            holidays = validation.Holidays.Select(h => new { date = h.Date.ToString("yyyy-MM-dd"), name = h.Name }).ToList()
        });
    }
}
