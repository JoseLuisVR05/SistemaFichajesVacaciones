namespace SistemaFichajesVacaciones.Domain.Entities;

public class Employee_WorkSchedule
{
    public int WorkScheduleId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public TimeSpan ExpectedStartTime { get; set; }
    public TimeSpan ExpectedEndTime { get; set; }
    public int BreakMinutes { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = null!;
}