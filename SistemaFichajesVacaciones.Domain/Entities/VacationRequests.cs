namespace SistemaFichajesVacaciones.Domain.Entities;

public class VacationRequests
{
    public int RequestId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal RequestedDays { get; set; }
    public string Type { get; set; } = "VACATION"; // VACATION, PERSONAL, OTHER
    public string Status { get; set; } = "DRAFT"; // DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
    public int? ApproverEmployeeId { get; set; }
    public string? ApproverComment { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? DecisionAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public Employee? Approver { get; set; }
    public ICollection<VacationRequest_Days> RequestDays { get; set; } 
        = new List<VacationRequest_Days>();
    public ICollection<AbsenceCalendar> AbsenceEntries { get; set; } 
        = new List<AbsenceCalendar>();
}