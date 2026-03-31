namespace SistemaFichajesVacaciones.Application.DTOs;

/// <summary>
/// Información resumida del horario de trabajo de un empleado
/// </summary>
public class WorkScheduleInfoDto
{
    public int? WorkScheduleId { get; set; }            // ID de Employee_WorkSchedule (null si es default del territorio)
    public int WorkScheduleTemplateId { get; set; }
    public string Name { get; set; } = string.Empty;  // Ej: "Horario Standard 8h España"
    public string? Description { get; set; }           // Descripción de la plantilla
    public string? Hours { get; set; }                  // Ej: "08:00-17:00"
    public bool IsException { get; set; }              // true si es Employee_WorkSchedule, false si es DEFAULT
    public bool IsDefault { get; set; }                // true si es la plantilla por defecto del territorio
}
