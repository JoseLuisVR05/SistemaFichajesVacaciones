using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/import")]
[Authorize]
[RequireRole("ADMIN", "RRHH")]
public class ImportRunsController : ControllerBase
{
    private readonly AppDbContext _db;
    
    public ImportRunsController(AppDbContext db) => _db = db;
    
    [HttpGet("runs")]
    public async Task<IActionResult> GetImportHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var runs = await _db.ImportRuns
            .Include(r => r.Errors)
            .OrderByDescending(r => r.ImportedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.ImportRunId,
                r.FileName,
                r.ImportedAt,
                r.TotalRows,
                r.SuccessRows,
                r.ErrorRows,
                r.Status,
                errorsCount = r.Errors.Count
            })
            .ToListAsync();
        
        return Ok(runs);
    }
    
    [HttpGet("runs/{id}/errors")]
    public async Task<IActionResult> GetImportErrors(int id)
    {
        var errors = await _db.ImportErrors
            .Where(e => e.ImportRunId == id)
            .OrderBy(e => e.RowNumber)
            .ToListAsync();
        
        return Ok(errors);
    }
}