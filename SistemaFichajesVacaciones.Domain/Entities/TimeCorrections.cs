namespace SistemaFichajesVacaciones.Domain.Entities;

public class TimeCorrection
{
    public int CorrectionId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public int? OriginalMinutes { get; set; }
    public int CorrectedMinutes { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
    public int? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = null!;
    public Users? ApprovedByUser { get; set; }
}