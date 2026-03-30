namespace SistemaFichajesVacaciones.Application.DTOs;

/// <summary>
/// Horario de trabajo asignado a un empleado
/// </summary>
public class WorkScheduleDto
{
    public int WorkScheduleId { get; set; }
    public int EmployeeId { get; set; }
    public int? WorkScheduleTemplateId { get; set; }
    
    /// <summary>Fecha desde la que es válido este horario</summary>
    public DateTime ValidFrom { get; set; }
    
    /// <summary>Fecha hasta la que es válido (null = indefinido)</summary>
    public DateTime? ValidTo { get; set; }
    
    /// <summary>Plantilla del horario con detalles por día</summary>
    public WorkScheduleTemplateDto? Template { get; set; }
    
    /// <summary>Notas adicionales</summary>
    public string? Notes { get; set; }
}

/// <summary>
/// Plantilla de horario (contiene detalles para cada día de la semana)
/// </summary>
public class WorkScheduleTemplateDto
{
    public int WorkScheduleTemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    /// <summary>Detalles del horario para cada día (0=Lunes, 6=Domingo)</summary>
    public List<WorkScheduleDayDetailDto> DayDetails { get; set; } = new();
}

/// <summary>
/// Detalle del horario para un día específico de la semana
/// </summary>
public class WorkScheduleDayDetailDto
{
    /// <summary>Día de la semana (0=Lunes, 6=Domingo)</summary>
    public int DayOfWeek { get; set; }
    
    /// <summary>¿Es día laboral?</summary>
    public bool IsWorkDay { get; set; }
    
    /// <summary>Hora de inicio esperada</summary>
    public TimeOnly? ExpectedStartTime { get; set; }
    
    /// <summary>Hora de fin esperada</summary>
    public TimeOnly? ExpectedEndTime { get; set; }
    
    /// <summary>Minutos de descanso permitidos</summary>
    public int BreakMinutes { get; set; }
}
