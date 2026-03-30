namespace SistemaFichajesVacaciones.Domain.Entities;

public class WorkScheduleDayDetail
{
    public int WorkScheduleDayDetailId { get; set; }
    
    public int WorkScheduleTemplateId { get; set; }  // FK → WorkScheduleTemplate
    
    public int DayOfWeek { get; set; }  // 0=Monday, 1=Tuesday, ..., 6=Sunday
    
    public bool IsWorkDay { get; set; } = true;  // ¿Es día laboral?
    
    public TimeOnly? ExpectedStartTime { get; set; }  // Ej: 08:00
    public TimeOnly? ExpectedEndTime { get; set; }    // Ej: 17:00
    
    public int BreakMinutes { get; set; } = 60;  // Minutos de descanso
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navegación
    public WorkScheduleTemplate? WorkScheduleTemplate { get; set; }
}
