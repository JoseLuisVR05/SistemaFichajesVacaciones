using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;
using SistemaFichajesVacaciones.Application.Interfaces;

namespace SistemaFichajesVacaciones.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de solicitudes de vacaciones.
/// Responsabilidades:
/// - Calcular días laborables excluyendo festivos/fines de semana
/// - Validar reglas de negocio de solicitudes
/// - Generar desglose diario de solicitudes
/// - Sincronizar calendario de ausencias
/// </summary>
public class VacationRequestService : IVacationRequestService
{
    private readonly AppDbContext _db;
    private readonly IVacationBalanceService _balanceService;

    public VacationRequestService(AppDbContext db, IVacationBalanceService balanceService)
    {
        _db = db;
        _balanceService = balanceService;
    }

    /// <summary>
    /// Obtiene TODOS los festivos del empleado de forma jerárquica.
    /// ORDEN: GLOBAL → NATIONAL → REGIONAL → CITY
    /// </summary>
    private async Task<List<Calendar_Days>> GetEmployeeHolidaysAsync(int employeeId, DateTime startDate, DateTime endDate)
    {
        // 1. Obtener employee y su CalendarTemplate
        var employee = await _db.Employees
            .Include(e => e.CalendarTemplate)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee?.CalendarTemplate == null || !employee.TerritoryId.HasValue)
            return new List<Calendar_Days>();

        var empTemplate = employee.CalendarTemplate;
        var territoryId = employee.TerritoryId.Value;

        // 2. Obtener TODOS los calendarios del territorio del empleado (NATIONAL + REGIONAL + CITY)
        var relevantTemplates = await _db.CalendarTemplates
            .AsNoTracking()
            .Where(ct => ct.IsActive 
                      && ct.TerritoryId == territoryId
                      && (
                        // NATIONAL (mismo territory)
                        (ct.Level == "NATIONAL") ||
                        // REGIONAL (mismo territory + mismo region si aplica)
                        (ct.Level == "REGIONAL" && ct.RegionCode == empTemplate.RegionCode) ||
                        // CITY (mismo territory + misma city)
                        (ct.Level == "CITY" && ct.CityCode == empTemplate.CityCode)
                      ))
            .Select(ct => ct.CalendarTemplateId)
            .ToListAsync();

        // 3. Obtener todos los dias festivos de esos calendarios en el rango
        var holidays = await _db.Calendar_Days
            .Where(cd => relevantTemplates.Contains(cd.CalendarTemplateId)
                      && cd.IsHoliday
                      && cd.Date >= startDate.Date 
                      && cd.Date <= endDate.Date)
            .AsNoTracking()
            .ToListAsync();

        // 4. Obtener también festivos globales (IsGlobal en Calendar_Days)
        var globalHolidays = await _db.Calendar_Days
            .Where(cd => cd.IsGlobal 
                      && cd.IsHoliday
                      && cd.Date >= startDate.Date 
                      && cd.Date <= endDate.Date)
            .AsNoTracking()
            .ToListAsync();

        // Combinar y eliminar duplicados por fecha
        var combined = holidays.Concat(globalHolidays)
            .GroupBy(h => h.Date)
            .Select(g => g.First())
            .ToList();

        return combined;
    }

    /// <summary>
    /// Calcula cuántos días LABORABLES hay entre dos fechas.
    /// Usa la jerarquía de calendarios del empleado (GLOBAL → NATIONAL → REGIONAL → CITY)
    /// </summary>
    public async Task<decimal> CalculateWorkingDaysAsync(DateTime startDate, DateTime endDate, int? employeeId = null)
    {
        // Validación básica: fin debe ser >= inicio
        if (endDate < startDate)
            return 0;

        // 1. Generar lista de TODAS las fechas del rango
        var days = new List<DateTime>();
        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            days.Add(date);
        }

        if (!days.Any())
            return 0;

        // 2. Obtener festivos del empleado (jerárquicamente)
        var holidays = employeeId.HasValue 
            ? await GetEmployeeHolidaysAsync(employeeId.Value, startDate, endDate)
            : new List<Calendar_Days>();

        // 3. Convertir a diccionario para búsqueda rápida O(1)
        var holidayDict = holidays.ToDictionary(h => h.Date);

        decimal workingDays = 0;

        // 4. Iterar cada día y determinar si es laborable
        foreach (var date in days)
        {
            bool isWorkingDay = true;

            // Verificar si es fin de semana
            if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
            {
                isWorkingDay = false;
            }
            // Verificar si es festivo
            else if (holidayDict.TryGetValue(date, out _))
            {
                isWorkingDay = false;
            }

            if (isWorkingDay)
            {
                workingDays += 1.0m;
            }
        }

        return workingDays;
    }

    /// <summary>
    /// Valida una solicitud de vacaciones contra reglas de negocio.
    /// VALIDACIONES EN ORDEN:
    /// 1. Fechas coherentes (fin >= inicio)
    /// 2. No solicitar en el pasado
    /// 3. Calcular días laborables
    /// 4. Verificar saldo disponible
    /// 5. Detectar solapamientos
    /// 6. Advertencias informativas
    /// </summary>
    public async Task<ValidationResult> ValidateRequestAsync(
        int employeeId, 
        DateTime startDate, 
        DateTime endDate, 
        int? excludeRequestId = null)
    {
        var result = new ValidationResult();

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 1: Fechas coherentes
        // ──────────────────────────────────────────────────
        if (endDate < startDate)
        {
            result.Errors.Add("La fecha de fin no puede ser anterior a la fecha de inicio");
            return result;  // Error crítico, no seguir validando
        }

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 2: No solicitar en el pasado
        // ──────────────────────────────────────────────────
        // Margen de 1 día para permitir correcciones inmediatas
        if (startDate.Date < DateTime.UtcNow.Date.AddDays(-1))
        {
            result.Errors.Add("No se pueden solicitar vacaciones en fechas pasadas");
            return result;
        }

        // ──────────────────────────────────────────────────
        // RECOPILACIÓN: Obtener TODOS los festivos del rango
        // ──────────────────────────────────────────────────
        // 1. Obtener el territorio del empleado
        var employee = await _db.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee?.TerritoryId == null)
        {
            result.Errors.Add("El empleado no tiene territorio asignado");
            return result;
        }

        // 2. Obtener festivos del empleado (jerárquicamente: GLOBAL → NATIONAL → REGIONAL → CITY)
        var holidaysList = await GetEmployeeHolidaysAsync(employeeId, startDate, endDate);
        var holidaysInRange = holidaysList
            .Select(c => new HolidayInfo { Date = c.Date, Name = c.HolidayName ?? "Festivo" })
            .ToList();

        result.Holidays = holidaysInRange;

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 3: Calcular días laborables
        // ──────────────────────────────────────────────────
        var workingDays = await CalculateWorkingDaysAsync(startDate, endDate, employeeId);
        result.WorkingDays = workingDays;

        // Advertencia: si el rango no incluye ningún día laborable
        if (workingDays == 0)
        {
            result.Warnings.Add("El período seleccionado no incluye días laborables");
        }

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 4: Verificar saldo disponible
        // ──────────────────────────────────────────────────
        var balance = await _balanceService.GetOrCreateBalanceAsync(employeeId, startDate.Year);
        
        if (balance == null)
        {
            result.Errors.Add($"No hay política de vacaciones configurada para el año {startDate.Year}");
            return result;
        }

        result.AvailableDays = balance.RemainingDays;

        // Comparar días solicitados vs disponibles
        if (workingDays > balance.RemainingDays)
        {
            result.Errors.Add(
                $"Saldo insuficiente. Disponible: {balance.RemainingDays} días, " +
                $"Solicitado: {workingDays} días"
            );
        }

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 5: Detectar solapamientos
        // ──────────────────────────────────────────────────
        // Buscar solicitudes que:
        // - Sean del mismo empleado
        // - NO estén rechazadas ni canceladas (activas)
        // - Se solapen con el rango solicitado
        // - NO sea la solicitud que estamos editando (excludeRequestId)
        var overlappingRequests = await _db.VacationRequests
            .Where(r => r.EmployeeId == employeeId
                     && r.Status != "REJECTED"
                     && r.Status != "CANCELLED"
                     && (excludeRequestId == null || r.RequestId != excludeRequestId)
                     && r.StartDate <= endDate    // Solapamiento: inicio antes del fin
                     && r.EndDate >= startDate)   // Solapamiento: fin después del inicio
            .ToListAsync();

        if (overlappingRequests.Any())
        {
            var overlapping = overlappingRequests.First();
            result.Errors.Add(
                $"Existe solapamiento con otra solicitud del " +
                $"{overlapping.StartDate:dd/MM/yyyy} al {overlapping.EndDate:dd/MM/yyyy} " +
                $"(Estado: {overlapping.Status})"
            );
        }

        // ──────────────────────────────────────────────────
        // VALIDACIÓN 6: Advertencias adicionales (no bloqueantes)
        // ──────────────────────────────────────────────────
        if (workingDays > 15)
        {
            result.Warnings.Add(
                "Está solicitando más de 15 días consecutivos. " +
                "Considere dividir la solicitud."
            );
        }

        // ──────────────────────────────────────────────────
        // RESULTADO FINAL
        // ──────────────────────────────────────────────────
        // IsValid = true si NO hay errores (warnings no bloquean)
        result.IsValid = !result.Errors.Any();

        return result;
    }

    /// <summary>
    /// Genera el desglose diario de una solicitud.
    /// PARA CADA DÍA crea un registro VacationRequest_Day con:
    /// - Fecha
    /// - DayFraction: 1.0 (día completo) o 0.5 (medio día) - futuro
    /// - IsHolidayOrWeekend: flag para identificar días no laborables
    /// 
    /// UTILIDAD:
    /// - Auditoría detallada día por día
    /// - Cálculos precisos en reportes
    /// - Soporte futuro para medios días
    /// </summary>
    public async Task<List<VacationRequest_Days>> GenerateRequestDaysAsync(
        int requestId, 
        DateTime startDate, 
        DateTime endDate)
    {
        var requestDays = new List<VacationRequest_Days>();

        // 1. Obtener calendario para el rango
        var calendarDays = await _db.Calendar_Days
            .Where(c => c.Date >= startDate.Date && c.Date <= endDate.Date)
            .ToListAsync();

        var calendarDict = calendarDays.ToDictionary(c => c.Date);

        // 2. Generar entrada para CADA DÍA del rango
        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            bool isHolidayOrWeekend = false;
            decimal dayFraction = 1.0m;  // Por ahora siempre día completo

            // Determinar si es festivo/fin de semana
            if (calendarDict.TryGetValue(date, out var calDay))
            {
                // Existe en Calendar_Days: usar flags
                isHolidayOrWeekend = calDay.IsWeekend || calDay.IsHoliday;
            }
            else
            {
                // No existe: aplicar regla por defecto
                isHolidayOrWeekend = date.DayOfWeek == DayOfWeek.Saturday || 
                                    date.DayOfWeek == DayOfWeek.Sunday;
            }

            // Crear registro del día
            var requestDay = new VacationRequest_Days
            {
                RequestId = requestId,
                Date = date,
                DayFraction = dayFraction,
                IsHolidayOrWeekend = isHolidayOrWeekend
            };

            requestDays.Add(requestDay);
        }

        return requestDays;
    }

    /// <summary>
    /// Sincroniza el calendario de ausencias (AbsenceCalendar) con el estado de una solicitud.
    /// COMPORTAMIENTO:
    /// - Solicitud APROBADA → Crea ausencias para cada día laborable
    /// - Solicitud RECHAZADA/CANCELADA → Elimina ausencias previas
    /// - Solicitud DRAFT/SUBMITTED → Elimina ausencias (no confirmadas)
    /// 
    /// UTILIDAD:
    /// - Reportes de ausencias por departamento/fecha
    /// - Planificación de recursos
    /// - Calendario visual de equipo
    /// </summary>
    public async Task SyncAbsenceCalendarAsync(int requestId)
    {
        // 1. Obtener la solicitud con días desglosados
        var request = await _db.VacationRequests
            .Include(r => r.RequestDays)  // Carga días en mismo query
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (request == null)
            return;

        // 2. Eliminar ausencias previas de esta solicitud
        // Esto limpia el calendario antes de re-sincronizar
        var existingAbsences = await _db.AbsenceCalendar
            .Where(a => a.SourceRequestId == requestId)
            .ToListAsync();

        _db.AbsenceCalendar.RemoveRange(existingAbsences);

        // 3. Si la solicitud está APROBADA, crear nuevas ausencias
        if (request.Status == "APPROVED")
        {
            // Solo crear ausencias para días LABORABLES
            // (festivos/fines de semana no cuentan como ausencias)
            foreach (var day in request.RequestDays.Where(d => !d.IsHolidayOrWeekend))
            {
                var absence = new AbsenceCalendar
                {
                    EmployeeId = request.EmployeeId,
                    Date = day.Date,
                    AbsenceType = request.Type,  // VACATION, PERSONAL, OTHER
                    SourceRequestId = requestId
                };

                _db.AbsenceCalendar.Add(absence);
            }
        }

        // 4. Guardar cambios
        await _db.SaveChangesAsync();
    }
}