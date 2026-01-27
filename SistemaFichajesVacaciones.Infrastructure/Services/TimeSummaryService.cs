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

        //Verificar si es festivo o fin de semana
        var calendarDay = await _db.Calendar_Days
            .SingleOrDefaultAsync(c => c.Date == dateOnly);
        
        bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);
        
        //Obtener horario del empleado para esa fecha
        var schedule = await _db.Employee_WorkSchedules
            .Where(s => s.EmployeeId == employeeId 
                && s.ValidFrom <= dateOnly 
                && (s.ValidTo == null || s.ValidTo >= dateOnly))
            .OrderByDescending(s => s.ValidFrom)
            .FirstOrDefaultAsync();

        int expectedMinutes = 0;
        if (isWorkingDay && schedule != null)
        {
            var workDuration = schedule.ExpectedEndTime - schedule.ExpectedStartTime;
            expectedMinutes = (int)workDuration.TotalMinutes - schedule.BreakMinutes;
        }

        //Obtener todos los fichajes del dia ordenados
        var entries = await _db.TimeEntries
            .Where(e => e.EmployeeId == employeeId && e.EventTime >= dateOnly && e.EventTime < nextDay)
            .OrderBy(e => e.EventTime)
            .ToListAsync();

        int totalMinutes = 0;

        // Calcular minutos trabajados
        TimeEntry? lastIn = null;
        foreach (var entry in entries)
        {
            if (entry.EntryType == "IN")
            {
                lastIn = entry;
            }
            else if (entry.EntryType == "OUT" && lastIn != null)
            {
                var span = entry.EventTime - lastIn.EventTime;
                totalMinutes += (int)span.TotalMinutes;
                lastIn = null; // Reiniciar para siguiente par
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
                    ExpectedMinutes = expectedMinutes // 8 horas por defecto
                };
                _db.TimeDailySummaries.Add(summary); 
            }
            else
            {
                summary.ExpectedMinutes = expectedMinutes; 
            }

            summary.WorkedMinutes = totalMinutes;
            summary.LastCalculatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return summary;
    }
}
    