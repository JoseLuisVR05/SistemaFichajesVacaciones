using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;


namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var employees = await _context.Employees
            .Where(e => e.IsActive)
            .OrderBy(e =>e.EmployeeCode)
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
                return BadRequest("Archivo vacío");

                // aquí irá la lógica
            return Ok("Archivo recibido correctamente");
        }
    
}

