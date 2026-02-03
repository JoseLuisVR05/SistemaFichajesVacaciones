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

