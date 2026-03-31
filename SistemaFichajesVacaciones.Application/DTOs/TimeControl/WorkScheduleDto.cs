namespace SistemaFichajesVacaciones.Application.DTOs;

using System.Text.Json.Serialization;

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

    /// <summary>¿Es el horario por defecto del territorio? (true) o una excepción asignada? (false)</summary>
    public bool IsDefault { get; set; } = false;
    
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
    [JsonPropertyName("breakMinutes")]
    public int BreakMinutes { get; set; } = 0;  // Default a 0 para permitir ese valor
}

/// <summary>
/// DTO para crear una nueva WorkScheduleTemplate
/// </summary>
public class CreateWorkScheduleTemplateDto
{
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    public int TerritoryId { get; set; }
    
    public bool? IsActive { get; set; } = true;
    
    public bool? IsDefault { get; set; } = false;
    
    public List<WorkScheduleDayDetailDto> DayDetails { get; set; } = new();
}

/// <summary>
/// DTO para actualizar una WorkScheduleTemplate
/// </summary>
public class UpdateWorkScheduleTemplateDto
{
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    public bool? IsActive { get; set; }
    
    public bool? IsDefault { get; set; }
    
    public List<WorkScheduleDayDetailDto>? DayDetails { get; set; }
}

/// <summary>
/// DTO detallado de WorkScheduleTemplate (con info completa)
/// </summary>
public class WorkScheduleTemplateDetailsDto
{
    public int WorkScheduleTemplateId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    public int TerritoryId { get; set; }
    
    public bool IsActive { get; set; }
    
    public bool IsDefault { get; set; }
    
    public List<WorkScheduleDayDetailDto> DayDetails { get; set; } = new();
}

/// <summary>
/// DTO para asignar una template a un empleado
/// </summary>
public class AssignTemplateToEmployeeDto
{
    public int EmployeeId { get; set; }
    
    public int WorkScheduleTemplateId { get; set; }
    
    public DateTime? ValidTo { get; set; } // null = indefinido
}
