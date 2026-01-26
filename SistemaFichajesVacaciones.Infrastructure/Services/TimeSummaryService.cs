using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface ITimeSummaryService
{
    Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date);
}

public class TimeSummaryService : ITimeSummaryService
{
    private readonly AppDbContext _db;
    public TimeSummaryService(AppDbContext db) => _db = db;

    public async Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
        var nextDay = dateOnly.AddDays(1);

        //Obtener todos los fichajes del dia ordenados
        var entries = await _db.TimeEntries
            .Where(e => e.EmployeeId == employeeId && e.EventTime >= dateOnly && e.EventTime < nextDay)
            .OrderBy(e => e.EventTime)
            .ToListAsync();

        int totalMinutes = 0;

        //Calcular por pares IN/OUT
        for (int i = 0; i < entries.Count - 1; i += 2)
        {

            if (entries[i].EntryType == "IN" && entries[i + 1].EntryType == "OUT")
            {
                var span = entries[i + 1].EventTime - entries[i].EventTime;
                totalMinutes += (int)span.TotalMinutes;
            }
        }

        //Buscar o crear  resumen
        var summary = await _db.TimeDailySummaries
            .SingleOrDefaultAsync(s => s.EmployeeId == employeeId && s.Date == dateOnly);
           if (summary == null)
            {
                summary = new TimeDailySummary
                {
                    EmployeeId = employeeId,
                    Date = dateOnly,
                    ExpectedMinutes = 480, // 8 horas por defecto
                };
                _db.TimeDailySummaries.Add(summary); 
            }

            summary.WorkedMinutes = totalMinutes;
            summary.LastCalculatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return summary;
    }
}
    