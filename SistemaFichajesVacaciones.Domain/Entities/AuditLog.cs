namespace SistemaFichajesVacaciones.Domain.Entities;

    public class AuditLog
{
    public int AuditId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string Action { get; set; } = string.Empty; // CREATE, UPDATE, DELETE
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public int PerformedByUserId { get; set; }
    public DateTime PerformedAt { get; set; }
    
    public Users PerformedByUser { get; set; } = null!;
}
