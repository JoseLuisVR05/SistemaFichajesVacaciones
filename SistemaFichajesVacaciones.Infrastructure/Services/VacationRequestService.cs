using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface IVacationRequestService
{
    /// <summary>
    /// Calcula días laborables entre dos fechas (excluyendo fines de semana y festivos)
    /// </summary>
    Task<decimal> CalculateWorkingDaysAsync(DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Valida que una solicitud de vacaciones sea viable (saldo, solapamientos, etc)
    /// </summary>
    Task<ValidationResult> ValidateRequestAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null);
    
    /// <summary>
    /// Genera los días desglosados de una solicitud (VacationRequest_Days)
    /// </summary>
    Task<List<VacationRequest_Days>> GenerateRequestDaysAsync(int requestId, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Actualiza el calendario de ausencias cuando se aprueba/rechaza una solicitud
    /// </summary>
    Task SyncAbsenceCalendarAsync(int requestId);
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public decimal WorkingDays { get; set; }
    public decimal AvailableDays { get; set; }
}

//Lógica de negocio del servicio

public class VacationRequestService : IVacationRequestService
{
    private readonly AppDbContext _db;
    private readonly IVacationBalanceService _balanceService;

    public VacationRequestService(AppDbContext db, IVacationBalanceService balanceService)
    {
        _db = db;
        _balanceService = balanceService;
    }

    // Calcular días laborables
    public async Task<decimal> CalculateWorkingDaysAsync(DateTime startDate, DateTime endDate)
    {
        if (endDate < startDate)
            return 0;

        var days = new List<DateTime>();
        
        // Generar lista de días en el rango
        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            days.Add(date);
        }

        if (!days.Any())
            return 0;

        // Obtener información de calendario (festivos y fines de semana)
        var calendarDays = await _db.Calendar_Days
            .Where(c => c.Date >= startDate.Date && c.Date <= endDate.Date)
            .ToListAsync();

        var calendarDict = calendarDays.ToDictionary(c => c.Date);

        decimal workingDays = 0;

        foreach (var date in days)
        {
            // Si existe en Calendar_Days, usar esa info
            if (calendarDict.TryGetValue(date, out var calDay))
            {
                // Si NO es fin de semana NI festivo, es laborable
                if (!calDay.IsWeekend && !calDay.IsHoliday)
                {
                    workingDays += 1.0m;
                }
            }
            else
            {
                // Si no está en Calendar_Days, asumir que sábado/domingo no son laborables
                if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
                {
                    workingDays += 1.0m;
                }
            }
        }

        return workingDays;
    }

    // Validar solicitud de vacaciones  
    public async Task<ValidationResult> ValidateRequestAsync(
        int employeeId, 
        DateTime startDate, 
        DateTime endDate, 
        int? excludeRequestId = null)
    {
        var result = new ValidationResult();

        // VALIDACIÓN 1: Fechas coherentes
        if (endDate < startDate)
        {
            result.Errors.Add("La fecha de fin no puede ser anterior a la fecha de inicio");
            return result;
        }

        // VALIDACIÓN 2: No solicitar en el pasado (con margen de 1 día)
        if (startDate.Date < DateTime.Now.Date.AddDays(-1))
        {
            result.Errors.Add("No se pueden solicitar vacaciones en fechas pasadas");
            return result;
        }

        // VALIDACIÓN 3: Calcular días laborables
        var workingDays = await CalculateWorkingDaysAsync(startDate, endDate);
        result.WorkingDays = workingDays;

        if (workingDays == 0)
        {
            result.Warnings.Add("El período seleccionado no incluye días laborables");
        }

        // VALIDACIÓN 4: Verificar saldo disponible
        var balance = await _balanceService.GetOrCreateBalanceAsync(employeeId, startDate.Year);
        
        if (balance == null)
        {
            result.Errors.Add($"No hay política de vacaciones configurada para el año {startDate.Year}");
            return result;
        }

        result.AvailableDays = balance.RemainingDays;

        if (workingDays > balance.RemainingDays)
        {
            result.Errors.Add($"Saldo insuficiente. Disponible: {balance.RemainingDays} días, Solicitado: {workingDays} días");
        }

        // VALIDACIÓN 5: Verificar solapamientos con otras solicitudes
        var overlappingRequests = await _db.VacationRequests
            .Where(r => r.EmployeeId == employeeId
                     && r.Status != "REJECTED"
                     && r.Status != "CANCELLED"
                     && (excludeRequestId == null || r.RequestId != excludeRequestId)
                     && r.StartDate <= endDate
                     && r.EndDate >= startDate)
            .ToListAsync();

        if (overlappingRequests.Any())
        {
            var overlapping = overlappingRequests.First();
            result.Errors.Add($"Existe solapamiento con otra solicitud del {overlapping.StartDate:dd/MM/yyyy} al {overlapping.EndDate:dd/MM/yyyy} (Estado: {overlapping.Status})");
        }

        // VALIDACIÓN 6: Advertencias adicionales
        if (workingDays > 15)
        {
            result.Warnings.Add("Está solicitando más de 15 días consecutivos. Considere dividir la solicitud.");
        }

        // Determinar si es válida
        result.IsValid = !result.Errors.Any();

        return result;
    }

    // Generar días desglosados de la solicitud
    public async Task<List<VacationRequest_Days>> GenerateRequestDaysAsync(
        int requestId, 
        DateTime startDate, 
        DateTime endDate)
    {
        var requestDays = new List<VacationRequest_Days>();

        // Obtener calendario para el rango
        var calendarDays = await _db.Calendar_Days
            .Where(c => c.Date >= startDate.Date && c.Date <= endDate.Date)
            .ToListAsync();

        var calendarDict = calendarDays.ToDictionary(c => c.Date);

        // Generar entrada para cada día del rango
        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            bool isHolidayOrWeekend = false;
            decimal dayFraction = 1.0m;

            // Verificar si es festivo o fin de semana
            if (calendarDict.TryGetValue(date, out var calDay))
            {
                isHolidayOrWeekend = calDay.IsWeekend || calDay.IsHoliday;
            }
            else
            {
                // Si no está en calendario, asumir sábado/domingo como no laborables
                isHolidayOrWeekend = date.DayOfWeek == DayOfWeek.Saturday || 
                                    date.DayOfWeek == DayOfWeek.Sunday;
            }

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

    // Sincronizar calendario de ausencias
    public async Task SyncAbsenceCalendarAsync(int requestId)
    {
        // Obtener la solicitud
        var request = await _db.VacationRequests
            .Include(r => r.RequestDays)
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (request == null)
            return;

        // Eliminar ausencias previas de esta solicitud
        var existingAbsences = await _db.AbsenceCalendar
            .Where(a => a.SourceRequestId == requestId)
            .ToListAsync();

        _db.AbsenceCalendar.RemoveRange(existingAbsences);

        // Si la solicitud está APROBADA, crear ausencias
        if (request.Status == "APPROVED")
        {
            foreach (var day in request.RequestDays.Where(d => !d.IsHolidayOrWeekend))
            {
                var absence = new AbsenceCalendar
                {
                    EmployeeId = request.EmployeeId,
                    Date = day.Date,
                    AbsenceType = request.Type,
                    SourceRequestId = requestId
                };

                _db.AbsenceCalendar.Add(absence);
            }
        }

        await _db.SaveChangesAsync();
    }
}