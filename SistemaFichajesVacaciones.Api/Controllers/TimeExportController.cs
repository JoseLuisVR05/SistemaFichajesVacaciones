using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;
using System.Text;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/time-entries")]
[Authorize]
public class TimeExportController : ControllerBase
{
    private readonly AppDbContext _db;

    public TimeExportController(AppDbContext db) => _db = db;

    /// <summary>
    /// Exportar fichajes a CSV. ADMIN/RRHH pueden exportar de cualquier empleado.
    /// MANAGER solo de sus subordinados. EMPLOYEE solo los propios.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportEntries(
        [FromQuery] int? employeeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "csv")
    {
        var userIdClaim = User.FindFirst("userId")?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _db.Users
            .Include(u => u.Employee)
            .SingleAsync(u => u.UserId == userId);

        // Determina qué empleados puede exportar
        IQueryable<Domain.Entities.TimeEntry> query = _db.TimeEntries
            .Include(e => e.Employee);

        if (employeeId.HasValue)
        {
            // Verificar permisos
            var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
            if (!isAdminOrRrhh)
            {
                if (User.IsInRole("MANAGER"))
                {
                    var subordinateIds = await _db.Employees
                        .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    if (!subordinateIds.Contains(employeeId.Value))
                        return Forbid();
                }
                else if (user.EmployeeId != employeeId.Value)
                {
                    return Forbid();
                }
            }
            query = query.Where(e => e.EmployeeId == employeeId.Value);
        }
        else
        {
            // Sin employeeId: ADMIN/RRHH ven todo, resto solo lo propio
            var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
            if (!isAdminOrRrhh)
            {
                if (user.EmployeeId == null)
                    return BadRequest(new { message = "Usuario sin empleado asignado" });

                query = query.Where(e => e.EmployeeId == user.EmployeeId.Value);
            }
        }

        // Filtros de fecha
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        query = query.Where(e => e.EventTime >= fromDate.Date);
        query = query.Where(e => e.EventTime <= toDate.Date.AddDays(1).AddSeconds(-1));

        var entries = await query
            .OrderBy(e => e.Employee.FullName)
            .ThenBy(e => e.EventTime)
            .Select(e => new
            {
                EmpleadoCodigo = e.Employee.EmployeeCode,
                EmpleadoNombre = e.Employee.FullName,
                Fecha = e.EventTime.ToString("yyyy-MM-dd"),
                Hora = e.EventTime.ToString("HH:mm:ss"),
                Tipo = e.EntryType,
                Origen = e.Source,
                Comentario = e.Comment ?? ""
            })
            .ToListAsync();

        // Generar CSV
        var sb = new StringBuilder();
        sb.AppendLine("Codigo;Empleado;Fecha;Hora;Tipo;Origen;Comentario");

        foreach (var e in entries)
        {
            sb.AppendLine($"{e.EmpleadoCodigo};{e.EmpleadoNombre};{e.Fecha};{e.Hora};{e.Tipo};{e.Origen};{e.Comentario}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        var fileName = $"fichajes_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.csv";

        return File(bytes, "text/csv; charset=utf-8", fileName);
    }
}