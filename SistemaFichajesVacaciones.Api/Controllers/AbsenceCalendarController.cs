using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/vacation/absence-calendar")]
[Authorize]
public class AbsenceCalendarController : ControllerBase
{
    private readonly AppDbContext _db;
    public AbsenceCalendarController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAbsences(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] string? department)
    {
        var query = _db.AbsenceCalendar
            .Include(a => a.Employee)
            .Where(a => a.Date >= from.Date && a.Date <= to.Date);

        if (!string.IsNullOrEmpty(department))
            query = query.Where(a => a.Employee.Department == department);

        // Filtrar según rol (similar a otros controllers)
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);
        var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");

        if (!isAdminOrRrhh && User.IsInRole("MANAGER"))
        {
            var subIds = await _db.Employees
                .Where(e => e.ManagerEmployeeId == user.EmployeeId)
                .Select(e => e.EmployeeId).ToListAsync();
            query = query.Where(a => subIds.Contains(a.EmployeeId));
        }
        else if (!isAdminOrRrhh)
        {
            query = query.Where(a => a.EmployeeId == user.EmployeeId);
        }

        var absences = await query
            .Select(a => new {
                a.Date, a.AbsenceType,
                a.EmployeeId, employeeName = a.Employee.FullName,
                department = a.Employee.Department
            }).ToListAsync();

        return Ok(absences);
    }
}