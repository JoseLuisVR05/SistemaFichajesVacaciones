
namespace SistemaFichajesVacaciones.Domain.Entities;

public class Roles
{
    public int RoleId { get; set; }
    public string Name { get; set; } = string.Empty; // ADMIN, RRHH, MANAGER, EMPLOYEE

    public string Description { get; set; } = string.Empty;
    // Navegación
    public ICollection<UserRoles> UserRoles { get; set; } = new List<UserRoles>();
}
