using System.Text.Json;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
public interface IAuditService
{
    Task LogAsync(string entityName, int entityId, string action, object? oldValue, object? newValue, int userId);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(string entityName, int entityId, string action, object? oldValue, object? newValue, int userId)
    {
        var audit = new AuditLog
        {
            EntityName = entityName,
            EntityId = entityId,
            Action = action,
            OldValueJson = oldValue != null ? JsonSerializer.Serialize(oldValue) : null,
            NewValueJson = newValue != null ? JsonSerializer.Serialize(newValue) : null,
            PerformedByUserId = userId,
            PerformedAt = DateTime.Now
        };
        
        _db.AuditLog.Add(audit);
        await _db.SaveChangesAsync();
    }
}

