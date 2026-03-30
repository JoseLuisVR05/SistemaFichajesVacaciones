namespace SistemaFichajesVacaciones.Application.DTOs;

/// <summary>
/// Registro de FileObject (entrada/salida)
/// </summary>
public class TimeEntryDto
{
    public int TimeEntryId { get; set; }
    
    /// <summary>Tipo de fichaje: IN, OUT, o deducido de posición de Terminal</summary>
    public string EntryType { get; set; } = string.Empty;
    
    /// <summary>Origen del tipo: EXPLICIT (app manual) o INFERRED (terminal/posición)</summary>
    public string EntryTypeSource { get; set; } = string.Empty;
    
    /// <summary>Timestamp del fichaje</summary>
    public DateTime? Time { get; set; }
    
    /// <summary>Origen del registro: TERMINAL, WEB, MOBILE</summary>
    public string? Source { get; set; }
    
    /// <summary>ID del dispositivo físico (null para app)</summary>
    public string? DeviceId { get; set; }
    
    /// <summary>Comentario del usuario</summary>
    public string? Comment { get; set; }
    
    /// <summary>Nombre del empleado</summary>
    public string? EmployeeName { get; set; }
}
