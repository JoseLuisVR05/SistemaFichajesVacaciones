using Microsoft.EntityFrameworkCore;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

/// <summary>
/// Servicio centralizado para lógica de autorización y verificación de permisos entre jefes y subordinados.
/// Evita duplicación de código en controllers.
/// </summary>
public interface IEmployeeAuthorizationService
{
    /// <summary>
    /// Obtiene los IDs de todos los subordinados directos de un manager.
    /// </summary>
    Task<List<int>> GetManagerSubordinateIdsAsync(int managerEmployeeId);

    /// <summary>
    /// Verifica si un manager es el jefe directo de un empleado.
    /// </summary>
    Task<bool> IsManagerOfEmployeeAsync(int managerEmployeeId, int employeeId);

    /// <summary>
    /// Obtiene los IDs filtrados solo si el usuario es manager del empleado,
    /// o retorna null si no tiene permiso.
    /// </summary>
    Task<List<int>?> GetSubordinateIdsSafeAsync(int managerEmployeeId, int requestedEmployeeId);
}

public class EmployeeAuthorizationService : IEmployeeAuthorizationService
{
    private readonly AppDbContext _db;

    public EmployeeAuthorizationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<int>> GetManagerSubordinateIdsAsync(int managerEmployeeId)
    {
        return await _db.Employees
            .Where(e => e.ManagerEmployeeId == managerEmployeeId)
            .Select(e => e.EmployeeId)
            .ToListAsync();
    }

    public async Task<bool> IsManagerOfEmployeeAsync(int managerEmployeeId, int employeeId)
    {
        return await _db.Employees
            .AnyAsync(e => e.EmployeeId == employeeId && 
                          e.ManagerEmployeeId == managerEmployeeId);
    }

    public async Task<List<int>?> GetSubordinateIdsSafeAsync(int managerEmployeeId, int requestedEmployeeId)
    {
        var subordinateIds = await GetManagerSubordinateIdsAsync(managerEmployeeId);
        
        // Si el empleado solicitado NO es subordinado, retornar null
        if (!subordinateIds.Contains(requestedEmployeeId))
            return null;

        return subordinateIds;
    }
}
