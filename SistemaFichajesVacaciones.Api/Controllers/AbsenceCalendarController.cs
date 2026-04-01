using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/vacation/absence-calendar")]
[Authorize]
public class AbsenceCalendarController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmployeeAuthorizationService _authService;
    
    public AbsenceCalendarController(AppDbContext db, IEmployeeAuthorizationService authService)
    {
        _db = db;
        _authService = authService;
    }

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

        // Filtrar según rol 
        var userId = int.Parse(User.FindFirst("userID")!.Value);
        var user = await _db.Users.SingleAsync(u => u.UserId == userId);
        var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");

        if (!isAdminOrRrhh && User.IsInRole("MANAGER"))
        {
            var subIds = await _authService.GetManagerSubordinateIdsAsync(user.EmployeeId ?? 0);
            // El MANAGER tambien puede ver las suyas
            if(user.EmployeeId.HasValue)
                subIds.Add(user.EmployeeId.Value);
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