using System.Globalization;
using System.Text.Json;
using SistemaFichajesVacaciones.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using SistemaFichajesVacaciones.Infrastructure;
public interface IAuditService
{
    Task LogAsync(string entityName, int entityId, string action, object? oldValue, object? newValue, int userId);
}

// Infrastructure/Services/AuditService.cs
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
            PerformedAt = DateTime.UtcNow
        };
        
        _db.AuditLog.Add(audit);
        await _db.SaveChangesAsync();
    }
}

