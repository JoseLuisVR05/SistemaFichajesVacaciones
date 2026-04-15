namespace NexusHR.Application.DTOs;

/// <summary>
/// Resumen diario de tiempo trabajado para un empleado
/// </summary>
public class TimeSummaryDto
{
    public DateTime Date { get; set; }
    
    /// <summary>Horas trabajadas (calculadas desde TimeEntries)</summary>
    public double WorkedHours { get; set; }
    
    /// <summary>Horas esperadas según el horario del empleado</summary>
    public double ExpectedHours { get; set; }
    
    /// <summary>Balance (Trabajadas - Esperadas)</summary>
    public double BalanceHours { get; set; }
    
    /// <summary>Tipo de incidencia detectada</summary>
    public string? IncidentType { get; set; }
    
    /// <summary>¿Tiene entrada abierta sin cerrar?</summary>
    public bool HasOpenEntry { get; set; }
    
    /// <summary>Minutos de corrección propuesta (si hay incidencia)</summary>
    public int ProposedCorrectionMinutes { get; set; }
}
