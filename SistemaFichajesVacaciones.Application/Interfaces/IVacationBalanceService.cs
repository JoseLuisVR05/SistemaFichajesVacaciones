using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Application.Interfaces;

/// <summary>
/// Servicio para gestionar saldos de vacaciones de empleados
/// Responsabilidades:
/// - Crear/obtener saldos por año
/// - Recalcular días consumidos basándose en solicitudes aprobadas
/// - Asignación masiva de saldos a empleados activos
/// </summary>
public interface IVacationBalanceService
{
    /// <summary>
    /// Obtiene el saldo de vacaciones de un empleado para un año específico.
    /// Si no existe, lo CREA automáticamente con la política por defecto del año.
    /// También calcula arrastre del año anterior si aplica.
    /// </summary>
    /// <param name="employeeId">ID del empleado</param>
    /// <param name="year">Año fiscal (ej: 2025)</param>
    /// <returns>Saldo con política incluida, o null si no hay política para ese año</returns>
    Task<Employee_VacationBalance?> GetOrCreateBalanceAsync(int employeeId, int year);

    /// <summary>
    /// Recalcula el saldo de un empleado sumando todas las solicitudes APROBADAS.
    /// Útil cuando:
    /// - Se aprueba/rechaza una solicitud
    /// - RRHH detecta inconsistencias
    /// - Se hace auditoría de datos
    /// </summary>
    /// <param name="employeeId">ID del empleado</param>
    /// <param name="year">Año a recalcular</param>
    /// <returns>Saldo actualizado o null si no existe</returns>
    Task<Employee_VacationBalance?> RecalculateBalanceAsync(int employeeId, int year);

    /// <summary>
    /// Asigna saldos masivamente a TODOS los empleados activos.
    /// Proceso:
    /// 1. Obtiene lista de empleados activos
    /// 2. Filtra los que YA tienen saldo para ese año/política (skip)
    /// 3. Para cada empleado nuevo:
    ///    - Calcula arrastre del año anterior (respetando límite de política)
    ///    - Crea saldo con días de política + arrastre
    /// </summary>
    /// <param name="policyId">ID de la política a aplicar</param>
    /// <param name="year">Año fiscal</param>
    /// <param name="performedByUserId">ID del usuario que ejecuta (para auditoría)</param>
    /// <returns>Resultado con contadores: creados, omitidos, total</returns>
    Task<BulkAssignResult> BulkAssignBalancesAsync(int policyId, int year, int performedByUserId);

    /// <summary>
    /// Verifica si un empleado tiene suficiente saldo para una solicitud.
    /// Usado en validaciones de negocio ANTES de crear la solicitud.
    /// </summary>
    /// <param name="employeeId">ID del empleado</param>
    /// <param name="year">Año de la solicitud</param>
    /// <param name="requestedDays">Días que quiere solicitar</param>
    /// <returns>true si tiene saldo suficiente, false si no</returns>
    Task<bool> HasSufficientBalanceAsync(int employeeId, int year, decimal requestedDays);
}

/// <summary>
/// Resultado de asignación masiva de saldos
/// Permite informar al usuario cuántos se procesaron
/// </summary>
public class BulkAssignResult
{
    public int Created { get; set; }   // Saldos nuevos creados
    public int Skipped { get; set; }   // Empleados que ya tenían saldo
    public int Total { get; set; }     // Total de empleados activos
}