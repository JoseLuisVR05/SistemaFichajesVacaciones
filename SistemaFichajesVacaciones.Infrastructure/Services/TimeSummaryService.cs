using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SistemaFichajesVacaciones.Domain.Configuration;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Domain.Constants;

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
    private readonly TimeTrackingOptions _options;

    public TimeSummaryService(AppDbContext db, IOptions<TimeTrackingOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    // ── MÉTODOS PÚBLICOS ──────────────────────────────────────────────────────

    public async Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
        var nextDay = dateOnly.AddDays(1);

        var employee = await _db.Employees
            .AsNoTracking()
            .Include(e => e.Territory)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null) return null;

        var territoryNow = TimeZoneHelper.GetTerritoryNow(employee.Territory);
        var calendarTemplate = await ResolveCalendarTemplateAsync(employee);
        bool isWorkingDay = await IsWorkingDayAsync(calendarTemplate, dateOnly);

        var effectiveTemplate = await ResolveWorkScheduleTemplateAsync(employeeId, dateOnly, employee);
        var defaultEndTime = TimeSpan.Parse(_options.DefaultWorkdayEnd);
        var (expectedMinutes, endTimeOfDay) = isWorkingDay
            ? GetExpectedMinutesForDay(effectiveTemplate, dateOnly, _options.DefaultWorkdayMinutes, defaultEndTime)
            : (0, defaultEndTime);

        var entries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId && e.Time != null && e.Time >= dateOnly && e.Time < nextDay)
            .OrderBy(e => e.Time)
            .ToListAsync();

        var (totalMinutes, hasOpenEntry) = CalculateWorkedMinutes(entries, dateOnly, territoryNow, endTimeOfDay, expectedMinutes);

        var approvedCorrections = await _db.TimeCorrections
            .AsNoTracking()
            .Where(tc => tc.EmployeeId == employeeId && tc.Date == dateOnly && tc.Status == CorrectionStatus.Approved)
            .ToListAsync();

        totalMinutes += approvedCorrections.Sum(tc => tc.CorrectedMinutes - (tc.OriginalMinutes ?? totalMinutes));

        string? incidentType = ResolveIncidentType(isWorkingDay, expectedMinutes, dateOnly, entries.Count, hasOpenEntry, totalMinutes);

        var summary = await _db.TimeDailySummaries
            .SingleOrDefaultAsync(s => s.EmployeeId == employeeId && s.Date == dateOnly);

        if (summary == null)
        {
            summary = new TimeDailySummary { EmployeeId = employeeId, Date = dateOnly };
            _db.TimeDailySummaries.Add(summary);
        }

        summary.ExpectedMinutes = expectedMinutes;
        summary.WorkedMinutes = totalMinutes;
        summary.BalanceMinutes = totalMinutes - expectedMinutes;
        summary.LastCalculatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        summary.IncidentType = incidentType;
        summary.HasOpenEntry = hasOpenEntry;
        return summary;
    }

    public async Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(int employeeId, DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var to = toDate.Date;
        var nextDay = to.AddDays(1);

        var employee = await _db.Employees
            .AsNoTracking()
            .Include(e => e.Territory)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null) return new List<TimeDailySummary>();

        var calendarTemplate = await ResolveCalendarTemplateAsync(employee);
        var defaultEndTime = TimeSpan.Parse(_options.DefaultWorkdayEnd);

        // Cargar todos los datos del rango en bloque (mínimo de queries)
        var calendarDays = calendarTemplate != null
            ? await _db.Calendar_Days
                .AsNoTracking()
                .Where(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId && c.Date >= from && c.Date <= to)
                .ToDictionaryAsync(c => c.Date)
            : new Dictionary<DateTime, Calendar_Days>();

        var workSchedules = await _db.Employee_WorkSchedules
            .AsNoTracking()
            .Include(s => s.WorkScheduleTemplate)
            .ThenInclude(t => t!.DayDetails)
            .Where(s => s.EmployeeId == employeeId && s.ValidFrom <= to && (s.ValidTo == null || s.ValidTo >= from))
            .OrderByDescending(s => s.ValidFrom)
            .ToListAsync();

        WorkScheduleTemplate? defaultTemplate = null;
        if (employee.TerritoryId.HasValue)
        {
            defaultTemplate = await _db.WorkScheduleTemplates
                .AsNoTracking()
                .Include(t => t.DayDetails)
                .FirstOrDefaultAsync(t => t.TerritoryId == employee.TerritoryId && t.IsDefault == true && t.IsActive == true);
        }

        var allEntries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId && e.Time != null && e.Time >= from && e.Time < nextDay)
            .OrderBy(e => e.Time)
            .ToListAsync();

        var entriesByDate = allEntries
            .GroupBy(e => e.Time!.Value.Date)
            .ToDictionary(g => g.Key, g => g.OrderBy(e => e.Time).ToList());

        var correctionsByDate = await _db.TimeCorrections
            .AsNoTracking()
            .Where(tc => tc.EmployeeId == employeeId && tc.Date >= from && tc.Date <= to && tc.Status == CorrectionStatus.Approved)
            .GroupBy(tc => tc.Date)
            .ToDictionaryAsync(g => g.Key, g => g.ToList());

        var existingSummaries = await _db.TimeDailySummaries
            .Where(s => s.EmployeeId == employeeId && s.Date >= from && s.Date <= to)
            .ToDictionaryAsync(s => s.Date);

        var results = new List<TimeDailySummary>();
        var territoryNow = TimeZoneHelper.GetTerritoryNow(employee.Territory);

        for (var d = from; d <= to; d = d.AddDays(1))
        {
            calendarDays.TryGetValue(d, out var calendarDay);
            bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

            var schedule = workSchedules.FirstOrDefault(s => s.ValidFrom <= d && (s.ValidTo == null || s.ValidTo >= d));
            var effectiveTemplate = schedule?.WorkScheduleTemplate ?? defaultTemplate;

            var (expectedMinutes, endTimeOfDay) = isWorkingDay
                ? GetExpectedMinutesForDay(effectiveTemplate, d, _options.DefaultWorkdayMinutes, defaultEndTime)
                : (0, defaultEndTime);

            entriesByDate.TryGetValue(d, out var dayEntries);
            dayEntries ??= new List<TimeEntry>();

            var (totalMinutes, hasOpenEntry) = CalculateWorkedMinutes(dayEntries, d, territoryNow, endTimeOfDay, expectedMinutes);

            if (correctionsByDate.TryGetValue(d, out var dayCorrections))
                totalMinutes += dayCorrections.Sum(tc => tc.CorrectedMinutes - (tc.OriginalMinutes ?? totalMinutes));

            string? incidentType = ResolveIncidentType(isWorkingDay, expectedMinutes, d, dayEntries.Count, hasOpenEntry, totalMinutes);

            if (existingSummaries.TryGetValue(d, out var summary))
            {
                summary.ExpectedMinutes = expectedMinutes;
                summary.WorkedMinutes = totalMinutes;
                summary.BalanceMinutes = totalMinutes - expectedMinutes;
                summary.LastCalculatedAt = DateTime.UtcNow;
            }
            else
            {
                summary = new TimeDailySummary
                {
                    EmployeeId = employeeId,
                    Date = d,
                    ExpectedMinutes = expectedMinutes,
                    WorkedMinutes = totalMinutes,
                    BalanceMinutes = totalMinutes - expectedMinutes,
                    LastCalculatedAt = DateTime.UtcNow
                };
                _db.TimeDailySummaries.Add(summary);
                existingSummaries[d] = summary;
            }

            summary.IncidentType = incidentType;
            summary.HasOpenEntry = hasOpenEntry;
            results.Add(summary);
        }

        await _db.SaveChangesAsync(); // Un solo save para todo el rango
        return results;
    }

    public async Task<TimeSummaryValidation> ValidateDayEntriesAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
        var nextDay = dateOnly.AddDays(1);
        var validation = new TimeSummaryValidation();

        var entries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId && e.Time != null && e.Time >= dateOnly && e.Time < nextDay)
            .OrderBy(e => e.Time)
            .ToListAsync();

        if (!entries.Any())
        {
            validation.Warnings.Add("No hay fichajes registrados para este dia");
            return validation;
        }

        int totalMinutes = 0;
        for (int i = 0; i < entries.Count - 1; i += 2)
        {
            var span = entries[i + 1].Time!.Value - entries[i].Time!.Value;
            totalMinutes += (int)span.TotalMinutes;
            if (span.TotalHours > 12)
                validation.Warnings.Add($"Sesion muy larga detectada: {span.TotalHours:F1}h");
        }

        if (entries.Count % 2 == 1)
        {
            validation.HasOpenEntry = true;
            validation.Warnings.Add($"Entrada sin cierre desde las {entries[^1].Time!.Value:HH:mm}");
        }

        var employee = await _db.Employees
            .AsNoTracking()
            .Include(e => e.Territory)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null) return validation;

        var calendarTemplate = await ResolveCalendarTemplateAsync(employee);
        bool isWorkingDay = await IsWorkingDayAsync(calendarTemplate, dateOnly);

        if (isWorkingDay)
        {
            var effectiveTemplate = await ResolveWorkScheduleTemplateAsync(employeeId, dateOnly, employee);
            var (expectedMinutes, _) = GetExpectedMinutesForDay(
                effectiveTemplate, dateOnly, _options.DefaultWorkdayMinutes, TimeSpan.Parse(_options.DefaultWorkdayEnd));
            validation.ExpectedMinutes = expectedMinutes;
        }

        validation.TotalMinutesWorked = totalMinutes;
        return validation;
    }

    // ── HELPERS PRIVADOS ──────────────────────────────────────────────────────

    // Resuelve el CalendarTemplate del empleado: primero su asignación personal,
    // luego el default de su territorio, o null si no tiene ninguno.
    private async Task<CalendarTemplate?> ResolveCalendarTemplateAsync(Employee employee)
    {
        if (employee.CalendarTemplateId.HasValue)
            return await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.CalendarTemplateId == employee.CalendarTemplateId);

        if (employee.TerritoryId.HasValue)
            return await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.TerritoryId == employee.TerritoryId
                                        && ct.Year == DateTime.UtcNow.Year
                                        && ct.IsDefault == true);
        return null;
    }

    // Comprueba si una fecha es día laborable según el calendario.
    // Sin calendario asignado, todo se considera laborable.
    private async Task<bool> IsWorkingDayAsync(CalendarTemplate? calendarTemplate, DateTime date)
    {
        if (calendarTemplate == null) return true;

        var calendarDay = await _db.Calendar_Days
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId
                                   && c.Date == date);

        return calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);
    }

    // Resuelve el horario efectivo para el empleado en una fecha:
    // primero busca una excepción personal, luego el default del territorio.
    private async Task<WorkScheduleTemplate?> ResolveWorkScheduleTemplateAsync(
        int employeeId, DateTime date, Employee employee)
    {
        var schedule = await _db.Employee_WorkSchedules
            .AsNoTracking()
            .Include(s => s.WorkScheduleTemplate)
            .ThenInclude(t => t!.DayDetails)
            .Where(s => s.EmployeeId == employeeId
                     && s.ValidFrom <= date
                     && (s.ValidTo == null || s.ValidTo >= date))
            .OrderByDescending(s => s.ValidFrom)
            .FirstOrDefaultAsync();

        if (schedule?.WorkScheduleTemplate != null)
            return schedule.WorkScheduleTemplate;

        if (!employee.TerritoryId.HasValue) return null;

        return await _db.WorkScheduleTemplates
            .AsNoTracking()
            .Include(t => t.DayDetails)
            .FirstOrDefaultAsync(t => t.TerritoryId == employee.TerritoryId
                                   && t.IsDefault == true
                                   && t.IsActive == true);
    }

    // Calcula los minutos esperados y la hora de fin para un día concreto,
    // según el template de horario y el día de la semana (0=Lun, 6=Dom).
    private static (int expectedMinutes, TimeSpan endTimeOfDay) GetExpectedMinutesForDay(
        WorkScheduleTemplate? template, DateTime date, int defaultMinutes, TimeSpan defaultEndTime)
    {
        if (template == null)
            return (defaultMinutes, defaultEndTime);

        int dayOfWeek = (int)date.DayOfWeek == 0 ? 6 : (int)date.DayOfWeek - 1;
        var dayDetail = template.DayDetails.FirstOrDefault(d => d.DayOfWeek == dayOfWeek);

        if (dayDetail == null || !dayDetail.IsWorkDay
            || !dayDetail.ExpectedStartTime.HasValue || !dayDetail.ExpectedEndTime.HasValue)
            return (0, defaultEndTime);

        var workDuration = dayDetail.ExpectedEndTime.Value.ToTimeSpan()
                         - dayDetail.ExpectedStartTime.Value.ToTimeSpan();
        int expectedMinutes = (int)Math.Round(workDuration.TotalMinutes) - dayDetail.BreakMinutes;
        return (expectedMinutes, dayDetail.ExpectedEndTime.Value.ToTimeSpan());
    }

    // Calcula los minutos trabajados en un día infiriendo pares entrada-salida
    // por posición (impar=entrada, par=salida).
    private static (int totalMinutes, bool hasOpenEntry) CalculateWorkedMinutes(
        List<TimeEntry> entries, DateTime date, DateTime territoryNow,
        TimeSpan endTimeOfDay, int expectedMinutes)
    {
        if (entries.Count == 0) return (0, false);

        int totalMinutes = 0;

        for (int i = 0; i < entries.Count - 1; i += 2)
            totalMinutes += (int)Math.Round((entries[i + 1].Time!.Value - entries[i].Time!.Value).TotalMinutes);

        if (entries.Count % 2 == 0)
            return (totalMinutes, false);

        // Número impar: la última entrada no tiene salida
        int openMinutes = CalculateOpenEntryMinutes(entries[^1], date, territoryNow, endTimeOfDay);
        totalMinutes = Math.Min(totalMinutes + openMinutes, expectedMinutes > 0 ? expectedMinutes : int.MaxValue);
        return (totalMinutes, true);
    }

    // Calcula cuántos minutos sumar por una entrada sin cerrar:
    // si es hoy, cuenta hasta ahora; si es un día pasado, hasta la hora fin del turno.
    private static int CalculateOpenEntryMinutes(
        TimeEntry lastEntry, DateTime date, DateTime territoryNow, TimeSpan endTimeOfDay)
    {
        if (date.Date == territoryNow.Date)
            return (int)Math.Round((territoryNow - lastEntry.Time!.Value).TotalMinutes);

        var cutoff = date.Add(endTimeOfDay);
        if (cutoff <= lastEntry.Time!.Value) return 0;

        return (int)Math.Round((cutoff - lastEntry.Time!.Value).TotalMinutes);
    }

    // Determina el tipo de incidencia para días pasados laborables con horario.
    private static string? ResolveIncidentType(
        bool isWorkingDay, int expectedMinutes, DateTime date,
        int entryCount, bool hasOpenEntry, int totalMinutes)
    {
        if (!isWorkingDay || expectedMinutes == 0 || date.Date >= DateTime.Now.Date)
            return null;

        if (entryCount == 0) return "NO_ENTRIES";
        if (hasOpenEntry) return "UNCLOSED_ENTRY";
        if (totalMinutes < expectedMinutes) return "INCOMPLETE";

        return null;
    }
}
