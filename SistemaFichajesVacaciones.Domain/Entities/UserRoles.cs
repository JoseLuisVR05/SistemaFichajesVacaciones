namespace SistemaFichajesVacaciones.Domain.Entities;

public class UserRoles
{
    public int UserId { get; set; }
    public Users User { get; set; } = null!;

    public int RoleId { get; set; }
    public Roles Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}