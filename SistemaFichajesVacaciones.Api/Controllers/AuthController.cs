using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Infrastructure.Services;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;

    public AuthController(AppDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.Employee)
            .SingleOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !user.IsEnabled)
            return Unauthorized(new { message = "Credenciales inválidas" });
        
        var primaryRole = user.UserRoles.FirstOrDefault()?.Role.Name;

        var token = _tokenService.GenerateToken(user.UserId, user.Email);
        
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            token,
            user = new
            {
                userId = user.UserId,
                email = user.Email,
                employeeId = user.EmployeeId,
                employeeName = user.Employee?.FullName,
                role = primaryRole
            }
        });
    }
}

public record LoginDto(string Email, string Password);