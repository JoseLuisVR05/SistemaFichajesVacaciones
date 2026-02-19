using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface ITimeSummaryService
{
    Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date);
    Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(int employeeId, DateTime fromDate, DateTime toDate);
    Task<TimeSummaryValidation> ValidateDayEntriesAsync(int employeeId, DateTime date);
}

public class TimeSummaryValidation
{
    public bool HasOpenEntry { get; set; }
    public bool HasSequenceErrors { get; set; }
    public List<string> Warnings { get; set; } = new();
    public int TotalMinutesWorked { get; set; }
    public int ExpectedMinutes { get; set; }
}

public class TimeSummaryService : ITimeSummaryService
{
    private readonly AppDbContext _db;
    public TimeSummaryService(AppDbContext db) => _db = db;

    public async Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
    var nextDay = dateOnly.AddDays(1);

    // Verificar si es festivo o fin de semana
    var calendarDay = await _db.Calendar_Days
        .AsNoTracking()
        .SingleOrDefaultAsync(c => c.Date == dateOnly);

    bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

    // Obtener horario del empleado para esa fecha
    var schedule = await _db.Employee_WorkSchedules
        .AsNoTracking()
        .Where(s => s.EmployeeId == employeeId
            && s.ValidFrom <= dateOnly
            && (s.ValidTo == null || s.ValidTo >= dateOnly))
        .OrderByDescending(s => s.ValidFrom)
        .FirstOrDefaultAsync();

    int expectedMinutes = 0;

    if (isWorkingDay)
    {
        if (schedule != null)
        {
            var workDuration = schedule.ExpectedEndTime - schedule.ExpectedStartTime;
            expectedMinutes = (int)workDuration.TotalMinutes - schedule.BreakMinutes;
        }
        else
        {
            expectedMinutes = 480; // 8h por defecto
        }
    }

    // Obtener todos los fichajes del día ordenados
    var entries = await _db.TimeEntries
        .AsNoTracking()
        .Where(e => e.EmployeeId == employeeId
                 && e.EventTime >= dateOnly
                 && e.EventTime < nextDay)
        .OrderBy(e => e.EventTime)
        .ToListAsync();

    int totalMinutes = 0;
    bool hasOpenEntry = false;
    TimeEntry? lastIn = null;

    foreach (var entry in entries)
    {
        if (entry.EntryType == "IN")
        {
            lastIn = entry;
        }
        else if (entry.EntryType == "OUT")
        {
            if (lastIn != null)
            {
                var span = entry.EventTime - lastIn.EventTime;
                totalMinutes += (int)span.TotalMinutes;
                lastIn = null;
            }
        }
    }

    // Entrada sin cerrar
    if (lastIn != null)
    {
        hasOpenEntry = true;

        if (dateOnly == DateTime.UtcNow.Date)
        {
            // HOY: sumar tiempo hasta ahora (balance en tiempo real)
            var span = DateTime.UtcNow - lastIn.EventTime;
            totalMinutes += (int)span.TotalMinutes;
        }
        else
        {
            // DÍA PASADO con entrada sin cerrar: 0 horas trabajadas (penalización completa)
            totalMinutes = 0;
        }
    }

    // Calcular balance: trabajado - esperado
    // Fin de semana → expectedMinutes=0 → balance=0 siempre
    // Día laboral sin fichar → 0 - 480 = -480
    // Día laboral fichado 8h → 480 - 480 = 0
    // Día laboral fichado 9h → 540 - 480 = +60
    var balance = totalMinutes - expectedMinutes;

    // Guardar o actualizar resumen
    var summary = await _db.TimeDailySummaries
        .SingleOrDefaultAsync(s => s.EmployeeId == employeeId && s.Date == dateOnly);

    if (summary == null)
    {
        summary = new TimeDailySummary
        {
            EmployeeId = employeeId,
            Date = dateOnly,
            ExpectedMinutes = expectedMinutes,
            WorkedMinutes = totalMinutes,
            BalanceMinutes = balance,
            LastCalculatedAt = DateTime.UtcNow
        };
        _db.TimeDailySummaries.Add(summary);
    }
    else
    {
        summary.ExpectedMinutes = expectedMinutes;
        summary.WorkedMinutes = totalMinutes;
        summary.BalanceMinutes = balance;
        summary.LastCalculatedAt = DateTime.UtcNow;
    }

    await _db.SaveChangesAsync();
    return summary;
    }

    public async Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(int employeeId, DateTime fromDate, DateTime toDate)
    {
        var summaries = new List<TimeDailySummary>();

        for (var date = fromDate.Date; date <= toDate.Date; date = date.AddDays(1))
        {
            var summary = await CalculateDailySummaryAsync(employeeId, date);

            if( summary != null)
            {
                summaries.Add(summary);
            }
        }
        
        return summaries;
    }

    public async Task<TimeSummaryValidation> ValidateDayEntriesAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
        var nextDay = dateOnly.AddDays(1);

        var validation = new TimeSummaryValidation();

        //Obtenemos entradas del dia
        var entries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId && e.EventTime >= dateOnly && e.EventTime < nextDay)
            .OrderBy(e => e.EventTime)
            .ToListAsync();

        if( !entries.Any())
        {
            validation.Warnings.Add("No hay fichajes registrados para este dia");
            return validation;
        }

        //Validar secuencia
        TimeEntry? lastIn = null;
        int totalMinutes = 0;

        foreach( var entry in entries)
        {
            if(entry.EntryType == "IN")
            {
                if(lastIn != null)
                {
                    validation.HasSequenceErrors = true;
                    validation.Warnings.Add($"Entrada duplicada detectada a las {entry.EventTime:HH:mm}");
                }
                
                lastIn = entry;
            }
            else if (entry.EntryType == "OUT")
            {
                if(lastIn == null)
                {
                    validation.HasSequenceErrors = true;
                    validation.Warnings.Add($"Salida sin entrada previa a las {entry.EventTime:HH:mm}");
                }
                else
                {
                    var span = entry.EventTime - lastIn.EventTime;
                    totalMinutes += (int)span.TotalMinutes;

                    //Validar duraciones sospechosas
                    if(span.TotalHours >12)
                    {
                        validation.Warnings.Add($"Sesion muy larga detectada: {span.TotalHours:F1}h");
                    }

                    lastIn = null;
                }
            }
        }

        if(lastIn != null)
        {
            validation.HasOpenEntry = true;
            validation.Warnings.Add($"Entrada sin salida desde las {lastIn.EventTime:HH:mm}");
        }

        //Obtener minutos esperados
        var calendarDay = await _db.Calendar_Days
            .AsNoTracking()
            .SingleOrDefaultAsync(c => c.Date == dateOnly);
        
        bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

        if(isWorkingDay)
        {
            var schedule = await _db.Employee_WorkSchedules
                .AsNoTracking()
                .Where(s => s.EmployeeId == employeeId
                    && s.ValidFrom <= dateOnly
                    &&(s.ValidTo == null || s.ValidTo >=dateOnly))
                .OrderByDescending(s => s.ValidFrom)
                .FirstOrDefaultAsync();
            
            if (schedule != null)
            {
                var workDuration = schedule.ExpectedEndTime - schedule.ExpectedStartTime;
                validation.ExpectedMinutes = (int)workDuration.TotalMinutes - schedule.BreakMinutes;
            }
            else
            {
                validation.ExpectedMinutes = 480; // 8 horas por defecto
            }
        }

        validation.TotalMinutesWorked = totalMinutes;

        return validation;
    }
}
    