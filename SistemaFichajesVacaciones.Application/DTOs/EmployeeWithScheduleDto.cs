namespace SistemaFichajesVacaciones.Application.DTOs;

/// <summary>
/// DTO que combina datos básicos del empleado con su horario asignado
/// Usado en el endpoint GET /api/employees para que el admin vea el horario de cada empleado
/// </summary>
public class EmployeeWithScheduleDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public int? TerritoryId { get; set; }
    public string? Department { get; set; }
    public string? Company { get; set; }
    public bool IsActive { get; set; }
    
    /// <summary>
    /// Información del horario asignado (DEFAULT del territorio o excepción del empleado)
    /// </summary>
    public WorkScheduleInfoDto? WorkSchedule { get; set; }
}
