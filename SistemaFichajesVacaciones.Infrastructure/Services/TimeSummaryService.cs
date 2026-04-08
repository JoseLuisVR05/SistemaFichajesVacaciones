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

    private static DateTime GetTerritoryNow(Territory? territory) =>
        TimeZoneHelper.GetTerritoryNow(territory);

    public async Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date)
    {
        var dateOnly = date.Date;
        var nextDay = dateOnly.AddDays(1);

        // Obtener datos del empleado (Territory y Calendar)
        var employee = await _db.Employees
            .AsNoTracking()
            .Include(e => e.Territory)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            return null;

        // Hora "ahora" en la zona horaria del territorio del empleado (con DST correcto)
        var territoryNow = GetTerritoryNow(employee.Territory);

        // ── LÓGICA SMART: Obtener CalendarTemplate ──────────────────────────
        CalendarTemplate? calendarTemplate = null;

        if (employee.CalendarTemplateId.HasValue)
        {
            // Empleado con asignación especial de calendario
            calendarTemplate = await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.CalendarTemplateId == employee.CalendarTemplateId);
        }
        else if (employee.TerritoryId.HasValue)
        {
            // Usar calendario default del territorio
            calendarTemplate = await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.TerritoryId == employee.TerritoryId
                                        && ct.Year == DateTime.UtcNow.Year
                                        && ct.IsDefault == true);
        }

        // ── Verificar si es festivo o fin de semana ────────────────────────
        Calendar_Days? calendarDay = null;
        if (calendarTemplate != null)
        {
            calendarDay = await _db.Calendar_Days
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId
                                       && c.Date == dateOnly);
        }

        bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

        // Obtener horario del empleado para esa fecha
        var schedule = await _db.Employee_WorkSchedules
            .AsNoTracking()
            .Include(s => s.WorkScheduleTemplate)
            .ThenInclude(t => t!.DayDetails)
            .Where(s => s.EmployeeId == employeeId
                && s.ValidFrom <= dateOnly
                && (s.ValidTo == null || s.ValidTo >= dateOnly))
            .OrderByDescending(s => s.ValidFrom)
            .FirstOrDefaultAsync();

        int expectedMinutes = 0;
        TimeSpan endTimeOfDay = TimeSpan.Parse(_options.DefaultWorkdayEnd);

        if (isWorkingDay)
        {
            // 1. BUSCAR SI TIENE EXCEPCIÓN (Employee_WorkSchedule vigente)
            if (schedule == null)
            {
                // 2. SI NO TIENE EXCEPCIÓN, USAR DEFAULT DEL TERRITORIO
                if (employee?.TerritoryId.HasValue == true)
                {
                    var defaultTemplate = await _db.WorkScheduleTemplates
                        .AsNoTracking()
                        .Include(t => t.DayDetails)
                        .FirstOrDefaultAsync(t => 
                            t.TerritoryId == employee.TerritoryId
                            && t.IsDefault == true
                            && t.IsActive == true);
                    
                    if (defaultTemplate != null)
                    {
                        schedule = new Employee_WorkSchedule 
                        { 
                            WorkScheduleTemplate = defaultTemplate 
                        };
                    }
                }
            }

            // 3. CALCULAR MINUTOS ESPERADOS
            if (schedule != null && schedule.WorkScheduleTemplate != null)
            {
                // Obtener el detalle del horario para el día específico
                int dayOfWeek = (int)dateOnly.DayOfWeek == 0 ? 6 : (int)dateOnly.DayOfWeek - 1; // Convert to 0=Mon, 6=Sun
                var dayDetail = schedule.WorkScheduleTemplate.DayDetails
                    .FirstOrDefault(d => d.DayOfWeek == dayOfWeek);

                if (dayDetail != null && dayDetail.IsWorkDay && dayDetail.ExpectedStartTime.HasValue && dayDetail.ExpectedEndTime.HasValue)
                {
                    var startTime = dayDetail.ExpectedStartTime.Value;
                    var endTime = dayDetail.ExpectedEndTime.Value;
                    var workDuration = endTime.ToTimeSpan() - startTime.ToTimeSpan();
                    expectedMinutes = (int)Math.Round(workDuration.TotalMinutes) - dayDetail.BreakMinutes;
                    endTimeOfDay = endTime.ToTimeSpan();
                }
                else
                {
                    expectedMinutes = 0; // No work day or invalid schedule
                }
            }
            else
            {
                expectedMinutes = _options.DefaultWorkdayMinutes; // Default from config
            }
        }

        // Obtener todos los fichajes del día ordenados
        var entries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId
                    && e.Time != null
                    && e.Time >= dateOnly
                    && e.Time < nextDay)
            .OrderBy(e => e.Time)
            .ToListAsync();

        int totalMinutes = 0;
        bool hasOpenEntry = false;

        if (entries.Count == 0)
        {
            // Ningún fichaje en el día
            totalMinutes = 0;
        }
        else if (entries.Count == 1)
        {
            // Un solo fichaje: asumir que es entrada sin cerrar
            hasOpenEntry = true;
            if (dateOnly == territoryNow.Date)
            {
                // HOY en la zona del empleado: suma tiempo desde el fichaje hasta AHORA
                totalMinutes = (int)Math.Round((territoryNow - entries[0].Time!.Value).TotalMinutes);
            }
            else
            {
                var cutoff = dateOnly.Add(endTimeOfDay);
                if (cutoff > entries[0].Time!.Value)
                    totalMinutes = (int)Math.Round((cutoff - entries[0].Time!.Value).TotalMinutes);
                totalMinutes = Math.Min(totalMinutes, expectedMinutes);
            }
        }
        else
        {
            for (int i = 0; i < entries.Count - 1; i += 2)
            {
                totalMinutes += (int)Math.Round((entries[i + 1].Time!.Value - entries[i].Time!.Value).TotalMinutes);
            }

            if (entries.Count % 2 == 1)
            {
                hasOpenEntry = true;
                var lastEntry = entries[entries.Count - 1];

                if (dateOnly == territoryNow.Date)
                {
                    // HOY en la zona del empleado
                    totalMinutes += (int)Math.Round((territoryNow - lastEntry.Time!.Value).TotalMinutes);
                }
                else
                {
                    var cutoff = dateOnly.Add(endTimeOfDay);
                    if (cutoff > lastEntry.Time!.Value)
                        totalMinutes += (int)Math.Round((cutoff - lastEntry.Time.Value).TotalMinutes);
                    totalMinutes = Math.Min(totalMinutes, expectedMinutes);
                }
            }
        }

        // ── Agregar correcciones aprobadas ──────────────────────────────────
        var approvedCorrections = await _db.TimeCorrections
            .AsNoTracking()
            .Where(tc => tc.EmployeeId == employeeId
                    && tc.Date == dateOnly
                    && tc.Status == CorrectionStatus.Approved)
            .ToListAsync();

        // Sumar el delta (diferencia) de cada corrección aprobada
        int correctionMinutes = approvedCorrections
            .Sum(tc => tc.CorrectedMinutes - (tc.OriginalMinutes ?? totalMinutes));
        totalMinutes += correctionMinutes;  // Sumar todas las correcciones aprobadas

        // ── Tipo de incidencia (solo días pasados laborables con horario) ─────
        string? incidentType = null;

        if (isWorkingDay && expectedMinutes > 0 && dateOnly < DateTime.Now.Date)
        {
            if (entries.Count == 0)
                incidentType = "NO_ENTRIES";
            else if (hasOpenEntry)
                incidentType = "UNCLOSED_ENTRY";
            else if (totalMinutes < expectedMinutes)
                incidentType = "INCOMPLETE";
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

        // Asignar transientes después del save
        summary.IncidentType = incidentType;
        summary.HasOpenEntry = hasOpenEntry;

        return summary;
        }

        public async Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(int employeeId, DateTime fromDate, DateTime toDate)
        {
            var from = fromDate.Date;
            var to = toDate.Date;
            var nextDay = to.AddDays(1);

            // ── 1. Empleado (1 query) ────────────────────────────────────────
            var employee = await _db.Employees
                .AsNoTracking()
                .Include(e => e.Territory)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null) return new List<TimeDailySummary>();

            var territoryOffsetHours = employee.Territory?.UTC ?? 0;

            // ── 2. CalendarTemplate del empleado o territorio (1 query) ──────
            CalendarTemplate? calendarTemplate = null;
            if (employee.CalendarTemplateId.HasValue)
            {
                calendarTemplate = await _db.CalendarTemplates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(ct => ct.CalendarTemplateId == employee.CalendarTemplateId);
            }
            else if (employee.TerritoryId.HasValue)
            {
                calendarTemplate = await _db.CalendarTemplates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(ct => ct.TerritoryId == employee.TerritoryId
                                            && ct.Year == DateTime.UtcNow.Year
                                            && ct.IsDefault == true);
            }

            // ── 3. Todos los días del calendario en el rango (1 query) ───────
            var calendarDays = calendarTemplate != null
                ? await _db.Calendar_Days
                    .AsNoTracking()
                    .Where(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId
                             && c.Date >= from && c.Date <= to)
                    .ToDictionaryAsync(c => c.Date)
                : new Dictionary<DateTime, Calendar_Days>();

            // ── 4. Horarios del empleado vigentes en el rango (1 query) ──────
            var workSchedules = await _db.Employee_WorkSchedules
                .AsNoTracking()
                .Include(s => s.WorkScheduleTemplate)
                .ThenInclude(t => t!.DayDetails)
                .Where(s => s.EmployeeId == employeeId
                         && s.ValidFrom <= to
                         && (s.ValidTo == null || s.ValidTo >= from))
                .OrderByDescending(s => s.ValidFrom)
                .ToListAsync();

            // Horario default del territorio como fallback (1 query)
            WorkScheduleTemplate? defaultTemplate = null;
            if (employee.TerritoryId.HasValue)
            {
                defaultTemplate = await _db.WorkScheduleTemplates
                    .AsNoTracking()
                    .Include(t => t.DayDetails)
                    .FirstOrDefaultAsync(t =>
                        t.TerritoryId == employee.TerritoryId
                        && t.IsDefault == true
                        && t.IsActive == true);
            }

            // ── 5. Todos los fichajes del rango en una sola query ────────────
            var allEntries = await _db.TimeEntries
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId
                        && e.Time != null
                        && e.Time >= from
                        && e.Time < nextDay)
                .OrderBy(e => e.Time)
                .ToListAsync();

            var entriesByDate = allEntries
                .GroupBy(e => e.Time!.Value.Date)
                .ToDictionary(g => g.Key, g => g.OrderBy(e => e.Time).ToList());

            // ── 6. Todas las correcciones aprobadas del rango (1 query) ──────
            var allCorrections = await _db.TimeCorrections
                .AsNoTracking()
                .Where(tc => tc.EmployeeId == employeeId
                          && tc.Date >= from && tc.Date <= to
                          && tc.Status == CorrectionStatus.Approved)
                .ToListAsync();

            var correctionsByDate = allCorrections
                .GroupBy(tc => tc.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            // ── 7. Resúmenes existentes para upsert en bloque (1 query) ──────
            var existingSummaries = await _db.TimeDailySummaries
                .Where(s => s.EmployeeId == employeeId && s.Date >= from && s.Date <= to)
                .ToDictionaryAsync(s => s.Date);

            // ── Calcular en memoria para cada día ────────────────────────────
            var results = new List<TimeDailySummary>();
            var territoryNow = GetTerritoryNow(employee.Territory);
            var today = territoryNow.Date;  // "Hoy" en la zona horaria del territorio del empleado
            TimeSpan defaultEndTime = TimeSpan.Parse(_options.DefaultWorkdayEnd);

            for (var d = from; d <= to; d = d.AddDays(1))
            {
                calendarDays.TryGetValue(d, out var calendarDay);
                bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

                // Horario vigente para este día concreto
                var schedule = workSchedules.FirstOrDefault(s => s.ValidFrom <= d && (s.ValidTo == null || s.ValidTo >= d));
                var effectiveTemplate = schedule?.WorkScheduleTemplate ?? defaultTemplate;

                int expectedMinutes = 0;
                TimeSpan endTimeOfDay = defaultEndTime;

                if (isWorkingDay)
                {
                    if (effectiveTemplate != null)
                    {
                        int dayOfWeek = (int)d.DayOfWeek == 0 ? 6 : (int)d.DayOfWeek - 1;
                        var dayDetail = effectiveTemplate.DayDetails.FirstOrDefault(dd => dd.DayOfWeek == dayOfWeek);

                        if (dayDetail != null && dayDetail.IsWorkDay && dayDetail.ExpectedStartTime.HasValue && dayDetail.ExpectedEndTime.HasValue)
                        {
                            var workDuration = dayDetail.ExpectedEndTime.Value.ToTimeSpan() - dayDetail.ExpectedStartTime.Value.ToTimeSpan();
                            expectedMinutes = (int)Math.Round(workDuration.TotalMinutes) - dayDetail.BreakMinutes;
                            endTimeOfDay = dayDetail.ExpectedEndTime.Value.ToTimeSpan();
                        }
                    }
                    else
                    {
                        expectedMinutes = _options.DefaultWorkdayMinutes;
                    }
                }

                entriesByDate.TryGetValue(d, out var dayEntries);
                dayEntries ??= new List<TimeEntry>();

                int totalMinutes = 0;
                bool hasOpenEntry = false;

                if (dayEntries.Count == 1)
                {
                    hasOpenEntry = true;
                    if (d == today)
                        totalMinutes = (int)Math.Round((territoryNow - dayEntries[0].Time!.Value).TotalMinutes);
                    else
                    {
                        var cutoff = d.Add(endTimeOfDay);
                        if (cutoff > dayEntries[0].Time!.Value)
                            totalMinutes = (int)Math.Round((cutoff - dayEntries[0].Time!.Value).TotalMinutes);
                        totalMinutes = Math.Min(totalMinutes, expectedMinutes);
                    }
                }
                else if (dayEntries.Count > 1)
                {
                    for (int i = 0; i < dayEntries.Count - 1; i += 2)
                        totalMinutes += (int)Math.Round((dayEntries[i + 1].Time!.Value - dayEntries[i].Time!.Value).TotalMinutes);

                    if (dayEntries.Count % 2 == 1)
                    {
                        hasOpenEntry = true;
                        var lastEntry = dayEntries[dayEntries.Count - 1];
                        if (d == today)
                            totalMinutes += (int)Math.Round((territoryNow - lastEntry.Time!.Value).TotalMinutes);
                        else
                        {
                            var cutoff = d.Add(endTimeOfDay);
                            if (cutoff > lastEntry.Time!.Value)
                                totalMinutes += (int)Math.Round((cutoff - lastEntry.Time.Value).TotalMinutes);
                            totalMinutes = Math.Min(totalMinutes, expectedMinutes);
                        }
                    }
                }

                if (correctionsByDate.TryGetValue(d, out var dayCorrections))
                {
                    int correctionMinutes = dayCorrections.Sum(tc => tc.CorrectedMinutes - (tc.OriginalMinutes ?? totalMinutes));
                    totalMinutes += correctionMinutes;
                }

                string? incidentType = null;
                if (isWorkingDay && expectedMinutes > 0 && d < today)
                {
                    if (dayEntries.Count == 0)
                        incidentType = "NO_ENTRIES";
                    else if (hasOpenEntry)
                        incidentType = "UNCLOSED_ENTRY";
                    else if (totalMinutes < expectedMinutes)
                        incidentType = "INCOMPLETE";
                }

                int balance = totalMinutes - expectedMinutes;

                if (existingSummaries.TryGetValue(d, out var summary))
                {
                    summary.ExpectedMinutes = expectedMinutes;
                    summary.WorkedMinutes = totalMinutes;
                    summary.BalanceMinutes = balance;
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
                        BalanceMinutes = balance,
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

        //Obtenemos entradas del dia
        var entries = await _db.TimeEntries
            .AsNoTracking()
            .Where(e => e.EmployeeId == employeeId
                && e.Time != null
                && e.Time >= dateOnly 
                && e.Time < nextDay)
            .OrderBy(e => e.Time)
            .ToListAsync();

        if( !entries.Any())
        {
            validation.Warnings.Add("No hay fichajes registrados para este dia");
            return validation;
        }

        //Validar secuencia - Inferencia de pares entrada-salida
        int totalMinutes = 0;

        if (entries.Count > 0)
        {
            // 2 o más fichajes: asumir pares entrada-salida
            // Primero=entrada, segundo=salida, tercero=entrada, etc.
            for (int i = 0; i < entries.Count - 1; i += 2)
            {
                var entrada = entries[i].Time!.Value;
                var salida = entries[i + 1].Time!.Value;
                var span = salida - entrada;
                totalMinutes += (int)span.TotalMinutes;

                //Validar duraciones sospechosas
                if (span.TotalHours > 12)
                {
                    validation.Warnings.Add($"Sesion muy larga detectada: {span.TotalHours:F1}h");
                }
            }

            // Si hay número impar, el último fichaje quedó sin cerrar
            if (entries.Count % 2 == 1)
            {
                validation.HasOpenEntry = true;
                var lastEntry = entries[entries.Count - 1];
                validation.Warnings.Add($"Entrada sin cierre desde las {lastEntry.Time!.Value:HH:mm}");
            }
        }

        //Obtener minutos esperados - LÓGICA SMART para Calendar
        var employee = await _db.Employees
            .AsNoTracking()
            .Include(e => e.Territory)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            return validation;

        CalendarTemplate? calendarTemplate = null;

        if (employee.CalendarTemplateId.HasValue)
        {
            calendarTemplate = await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.CalendarTemplateId == employee.CalendarTemplateId);
        }
        else if (employee.TerritoryId.HasValue)
        {
            calendarTemplate = await _db.CalendarTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(ct => ct.TerritoryId == employee.TerritoryId
                                        && ct.Year == DateTime.UtcNow.Year
                                        && ct.IsDefault == true);
        }

        Calendar_Days? calendarDay = null;
        if (calendarTemplate != null)
        {
            calendarDay = await _db.Calendar_Days
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId
                                       && c.Date == dateOnly);
        }
        
        bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);

        if(isWorkingDay)
        {
            var schedule = await _db.Employee_WorkSchedules
                .AsNoTracking()
                    .Include(s => s.WorkScheduleTemplate)
                    .ThenInclude(t => t!.DayDetails)
                    .Where(s => s.EmployeeId == employeeId
                        && s.ValidFrom <= dateOnly
                        &&(s.ValidTo == null || s.ValidTo >=dateOnly))
                    .OrderByDescending(s => s.ValidFrom)
                    .FirstOrDefaultAsync();
                
                if (schedule != null && schedule.WorkScheduleTemplate != null)
                {
                    // Obtener el detalle del horario para el día específico
                    int dayOfWeek = (int)dateOnly.DayOfWeek == 0 ? 6 : (int)dateOnly.DayOfWeek - 1; // Convert to 0=Mon, 6=Sun
                    var dayDetail = schedule.WorkScheduleTemplate.DayDetails
                        .FirstOrDefault(d => d.DayOfWeek == dayOfWeek);

                    if (dayDetail != null && dayDetail.IsWorkDay && dayDetail.ExpectedStartTime.HasValue && dayDetail.ExpectedEndTime.HasValue)
                    {
                        var startTime = dayDetail.ExpectedStartTime.Value;
                        var endTime = dayDetail.ExpectedEndTime.Value;
                        var workDuration = endTime.ToTimeSpan() - startTime.ToTimeSpan();
                        validation.ExpectedMinutes = (int)Math.Round(workDuration.TotalMinutes) - dayDetail.BreakMinutes;
                    }
                    else
                    {
                        validation.ExpectedMinutes = 0; // No work day
                    }
                }
                else
                {
                    // Si no tiene excepción, usar DEFAULT del territorio
                    if (employee.TerritoryId.HasValue)
                    {
                        var defaultTemplate = await _db.WorkScheduleTemplates
                            .AsNoTracking()
                            .Include(t => t.DayDetails)
                            .FirstOrDefaultAsync(t => 
                                t.TerritoryId == employee.TerritoryId
                                && t.IsDefault == true
                                && t.IsActive == true);
                        
                        if (defaultTemplate != null)
                        {
                            int dayOfWeek = (int)dateOnly.DayOfWeek == 0 ? 6 : (int)dateOnly.DayOfWeek - 1;
                            var dayDetail = defaultTemplate.DayDetails
                                .FirstOrDefault(d => d.DayOfWeek == dayOfWeek);
                            
                            if (dayDetail != null && dayDetail.IsWorkDay && dayDetail.ExpectedStartTime.HasValue && dayDetail.ExpectedEndTime.HasValue)
                            {
                                var startTime = dayDetail.ExpectedStartTime.Value;
                                var endTime = dayDetail.ExpectedEndTime.Value;
                                var workDuration = endTime.ToTimeSpan() - startTime.ToTimeSpan();
                                validation.ExpectedMinutes = (int)Math.Round(workDuration.TotalMinutes) - dayDetail.BreakMinutes;
                            }
                        }
                    }
            }
        }

        validation.TotalMinutesWorked = totalMinutes;

        return validation;
    }
}
    