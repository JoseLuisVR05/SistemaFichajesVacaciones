using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusHR.Domain.Constants;
using NexusHR.Infrastructure;

namespace NexusHR.Api.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected int? TryGetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimNames.UserId)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    protected IActionResult UnauthorizedUser() =>
        Unauthorized(new { message = "Token inválido o claim ausente" });

    // Obtiene el userId y employeeId del usuario autenticado en una sola query.
    // Devuelve un IActionResult de error si el token es inválido o el usuario
    // no tiene empleado vinculado, evitando repetir ese bloque en cada método.
    protected async Task<(int userId, int employeeId, IActionResult? error)>
        GetCurrentEmployeeAsync(AppDbContext db)
    {
        var userId = TryGetCurrentUserId();
        if (userId == null)
            return (0, 0, UnauthorizedUser());

        var user = await db.Users
            .Where(u => u.UserId == userId.Value)
            .Select(u => new { u.UserId, u.EmployeeId })
            .SingleOrDefaultAsync();

        if (user?.EmployeeId == null)
            return (0, 0, BadRequest(new { message = "Usuario sin empleado asignado" }));

        return (user.UserId, user.EmployeeId.Value, null);
    }
}
  