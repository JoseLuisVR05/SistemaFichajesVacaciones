
namespace SistemaFichajesVacaciones.Domain.Entities;

public class Roles
{
    public int RoleId { get; set; }
    public string Name { get; set; } = string.Empty; // ADMIN, RRHH, MANAGER, EMPLOYEE

    // Navegación
    public ICollection<UserRoles> UserRoles { get; set; } = new List<UserRoles>();
}
