namespace SistemaFichajesVacaciones.Domain.Entities;

public class Employee_WorkSchedule
{
    public int WorkScheduleId { get; set; }
    public int EmployeeId { get; set; }
    public int? WorkScheduleTemplateId { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = null!;
    public WorkScheduleTemplate? WorkScheduleTemplate { get; set; }
}