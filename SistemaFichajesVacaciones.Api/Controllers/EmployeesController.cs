using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;


namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase// Controlador para devolver respuestas como ok(), notfound, badrequest, etc.
{
    private readonly AppDbContext _context;
    private readonly IEmployeeImportService _importService;

    public EmployeesController(AppDbContext context, IEmployeeImportService importService)
    {
        _context = context;
        _importService = importService;
    }

    [HttpGet]
        public async Task<IActionResult> GetAll()
        {
           var userIdClaim = User.FindFirst("userId")?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _context.Users.SingleAsync(u => u.UserId == userId);

            IQueryable<Employee> query = _context.Employees.Where(e => e.IsActive);

            //  ADMIN y RRHH ven todos
            var isAdminOrRrhh = User.IsInRole("ADMIN") || User.IsInRole("RRHH");
    
            if (!isAdminOrRrhh)
            {
                // MANAGER solo ve sus subordinados
                if (User.IsInRole("MANAGER"))
                {
                    query = query.Where(e => e.ManagerEmployeeId == user.EmployeeId);
                }
                else
                {
                    // ✅ EMPLOYEE no puede ver esta página
                    return Forbid();
                }
            }

    var employees = await query
        .OrderBy(e => e.EmployeeCode)
        .ToListAsync();

    return Ok(employees);
}
    [HttpGet("{id}")]
        public async Task<ActionResult<Employee>> GetEmployee(int id)
        {
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null)
            {
                return NotFound(new { message = "Empleado no encontrado" });
            }

            return Ok(employee);
        }

   
    [HttpPost("import")]
        public async Task<IActionResult> ImportEmployees(IFormFile file)
        {
            if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo vacío" });

        try
        {
            var result = await _importService.ImportFromCsvAsync(file);
            return Ok(new { message = "Importación finalizada", importRunId = result.ImportRunId, total = result.TotalRows, errors = result.ErrorRows });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error en la importación", detail = ex.Message });
        }
        }
    
}

