using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/vacation/policies")]
[Authorize]
[RequireRole("ADMIN", "RRHH")]
public class VacationPoliciesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public VacationPoliciesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>
    /// Listar todas las políticas, opcionalmente filtradas por año
    /// </summary>
    [HttpGet]
    [AllowAnonymous] // Cualquier usuario autenticado puede consultar políticas
    public async Task<IActionResult> GetPolicies([FromQuery] int? year)
    {
        var query = _db.VacationPolicies.AsQueryable();

        if (year.HasValue)
            query = query.Where(p => p.Year == year.Value);

        var policies = await query
            .OrderByDescending(p => p.Year)
            .ThenBy(p => p.Name)
            .Select(p => new
            {
                p.PolicyId,
                p.Name,
                p.Year,
                p.AccrualType,
                p.TotalDaysPerYear,
                p.CarryOverMaxDays,
                p.CreatedAt,
                p.UpdatedAt
            })
            .ToListAsync();

        return Ok(policies);
    }

    /// <summary>
    /// Obtener una política por su ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPolicy(int id)
    {
        var policy = await _db.VacationPolicies.FindAsync(id);

        if (policy == null)
            return NotFound(new { message = "Política no encontrada" });

        return Ok(policy);
    }

    /// <summary>
    /// Crear una nueva política de vacaciones
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePolicy([FromBody] CreatePolicyDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);

        // Validar que no exista ya una política con mismo nombre y año
        var exists = await _db.VacationPolicies
            .AnyAsync(p => p.Name == dto.Name && p.Year == dto.Year);

        if (exists)
            return BadRequest(new { message = $"Ya existe una política '{dto.Name}' para el año {dto.Year}" });

        // Validaciones de negocio
        if (dto.TotalDaysPerYear <= 0)
            return BadRequest(new { message = "Los días por año deben ser mayor que 0" });

        if (dto.CarryOverMaxDays < 0)
            return BadRequest(new { message = "Los días de arrastre no pueden ser negativos" });

        var policy = new VacationPolicies
        {
            Name = dto.Name.Trim(),
            Year = dto.Year,
            AccrualType = dto.AccrualType?.ToUpper() ?? "ANNUAL",
            TotalDaysPerYear = dto.TotalDaysPerYear,
            CarryOverMaxDays = dto.CarryOverMaxDays,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _db.VacationPolicies.Add(policy);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("VacationPolicies", policy.PolicyId, "CREATE", null, policy, userId);

        return Ok(new
        {
            message = "Política creada correctamente",
            policyId = policy.PolicyId
        });
    }

    /// <summary>
    /// Actualizar una política existente
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePolicy(int id, [FromBody] UpdatePolicyDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);

        var policy = await _db.VacationPolicies.FindAsync(id);
        if (policy == null)
            return NotFound(new { message = "Política no encontrada" });

        // Validar que el nuevo nombre+año no colisione con otra política
        if (!string.IsNullOrEmpty(dto.Name))
        {
            var duplicateExists = await _db.VacationPolicies
                .AnyAsync(p => p.PolicyId != id
                            && p.Name == dto.Name
                            && p.Year == (dto.Year ?? policy.Year));

            if (duplicateExists)
                return BadRequest(new { message = "Ya existe otra política con ese nombre para ese año" });
        }

        var oldValue = new
        {
            policy.Name,
            policy.Year,
            policy.AccrualType,
            policy.TotalDaysPerYear,
            policy.CarryOverMaxDays
        };

        // Aplicar cambios (solo los campos proporcionados)
        if (!string.IsNullOrEmpty(dto.Name))
            policy.Name = dto.Name.Trim();
        if (dto.Year.HasValue)
            policy.Year = dto.Year.Value;
        if (!string.IsNullOrEmpty(dto.AccrualType))
            policy.AccrualType = dto.AccrualType.ToUpper();
        if (dto.TotalDaysPerYear.HasValue)
        {
            if (dto.TotalDaysPerYear.Value <= 0)
                return BadRequest(new { message = "Los días por año deben ser mayor que 0" });
            policy.TotalDaysPerYear = dto.TotalDaysPerYear.Value;
        }
        if (dto.CarryOverMaxDays.HasValue)
        {
            if (dto.CarryOverMaxDays.Value < 0)
                return BadRequest(new { message = "Los días de arrastre no pueden ser negativos" });
            policy.CarryOverMaxDays = dto.CarryOverMaxDays.Value;
        }

        policy.UpdatedAt = DateTime.Now;
        await _db.SaveChangesAsync();

        await _audit.LogAsync("VacationPolicies", id, "UPDATE", oldValue,
            new { policy.Name, policy.Year, policy.AccrualType, policy.TotalDaysPerYear, policy.CarryOverMaxDays },
            userId);

        return Ok(new { message = "Política actualizada correctamente" });
    }

    /// <summary>
    /// Eliminar una política (solo si no tiene saldos asociados)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePolicy(int id)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);

        var policy = await _db.VacationPolicies.FindAsync(id);
        if (policy == null)
            return NotFound(new { message = "Política no encontrada" });

        // Verificar que no tenga saldos asociados
        var hasBalances = await _db.EmployeeVacationBalances
            .AnyAsync(b => b.PolicyId == id);

        if (hasBalances)
            return BadRequest(new
            {
                message = "No se puede eliminar: hay saldos de empleados asociados a esta política. " +
                          "Elimine primero los saldos o reasígnelos a otra política."
            });

        _db.VacationPolicies.Remove(policy);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("VacationPolicies", id, "DELETE", policy, null, userId);

        return Ok(new { message = "Política eliminada correctamente" });
    }
}

// ─── DTOs ────────────────────────────────────────────────────────
public record CreatePolicyDto(
    string Name,
    int Year,
    string? AccrualType,       // ANNUAL o MONTHLY (default: ANNUAL)
    decimal TotalDaysPerYear,
    decimal CarryOverMaxDays
);

public record UpdatePolicyDto(
    string? Name,
    int? Year,
    string? AccrualType,
    decimal? TotalDaysPerYear,
    decimal? CarryOverMaxDays
);