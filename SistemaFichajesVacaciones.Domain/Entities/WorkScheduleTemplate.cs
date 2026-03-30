namespace SistemaFichajesVacaciones.Domain.Entities;

public class WorkScheduleTemplate
{
    public int WorkScheduleTemplateId { get; set; }
    
    public string Name { get; set; } = string.Empty;  // 'Horario Standard ES'
    
    public int TerritoryId { get; set; }  // FK → Territory
    
    public string? Description { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navegación
    public ICollection<WorkScheduleDayDetail> DayDetails { get; set; } = new List<WorkScheduleDayDetail>();
}
