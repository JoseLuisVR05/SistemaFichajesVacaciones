using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Application.Interfaces;

/// <summary>
/// Servicio para gestionar solicitudes de vacaciones
/// Responsabilidades:
/// - Calcular días laborables entre fechas
/// - Validar solicitudes (saldo, solapamientos, reglas de negocio)
/// - Generar desglose diario de la solicitud
/// - Sincronizar calendario de ausencias cuando se aprueba
/// </summary>
public interface IVacationRequestService
{
    /// <summary>
    /// Calcula cuántos días LABORABLES hay entre dos fechas.
    /// Excluye:
    /// - Fines de semana (sábado/domingo)
    /// - Festivos marcados en Calendar_Days
    /// </summary>
    /// <param name="startDate">Fecha inicio (inclusive)</param>
    /// <param name="endDate">Fecha fin (inclusive)</param>
    /// <returns>Número de días laborables (puede ser decimal por medios días)</returns>
    Task<decimal> CalculateWorkingDaysAsync(DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Valida si una solicitud de vacaciones es viable.
    /// Validaciones realizadas:
    /// 1. Fechas coherentes (fin >= inicio)
    /// 2. No solicitar en el pasado (margen de 1 día)
    /// 3. Calcular días laborables
    /// 4. Verificar saldo disponible
    /// 5. Detectar solapamientos con otras solicitudes activas
    /// 6. Advertencias (ej: >15 días consecutivos)
    /// </summary>
    /// <param name="employeeId">ID del empleado</param>
    /// <param name="startDate">Fecha inicio</param>
    /// <param name="endDate">Fecha fin</param>
    /// <param name="excludeRequestId">ID de solicitud a excluir (usado en edición)</param>
    /// <returns>Resultado con IsValid, errores y warnings</returns>
    Task<ValidationResult> ValidateRequestAsync(
        int employeeId, 
        DateTime startDate, 
        DateTime endDate, 
        int? excludeRequestId = null);
    
    /// <summary>
    /// Genera el desglose diario de una solicitud.
    /// Para cada día del rango crea un registro VacationRequest_Day indicando:
    /// - Fecha
    /// - Fracción del día (1.0 = completo, 0.5 = medio)
    /// - Si es festivo/fin de semana
    /// Esto permite cálculos precisos y auditoría detallada.
    /// </summary>
    /// <param name="requestId">ID de la solicitud padre</param>
    /// <param name="startDate">Fecha inicio</param>
    /// <param name="endDate">Fecha fin</param>
    /// <returns>Lista de días desglosados</returns>
    Task<List<VacationRequest_Days>> GenerateRequestDaysAsync(
        int requestId, 
        DateTime startDate, 
        DateTime endDate);
    
    /// <summary>
    /// Sincroniza el calendario de ausencias (AbsenceCalendar).
    /// Comportamiento:
    /// - Si la solicitud está APPROVED: crea ausencias para cada día laboral
    /// - Si la solicitud está REJECTED/CANCELLED: elimina ausencias previas
    /// Esto mantiene el calendario actualizado para reportes y planificación.
    /// </summary>
    /// <param name="requestId">ID de la solicitud</param>
    Task SyncAbsenceCalendarAsync(int requestId);
}

/// <summary>
/// Resultado de validación de solicitud
/// Contiene tanto errores bloqueantes como advertencias informativas
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }                // ¿Pasa todas las validaciones?
    public List<string> Errors { get; set; } = new(); // Errores que impiden crear
    public List<string> Warnings { get; set; } = new(); // Advertencias no bloqueantes
    public decimal WorkingDays { get; set; }          // Días laborables calculados
    public decimal AvailableDays { get; set; }        // Días disponibles del empleado
}