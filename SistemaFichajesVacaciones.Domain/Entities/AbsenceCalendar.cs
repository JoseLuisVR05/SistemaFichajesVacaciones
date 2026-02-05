namespace SistemaFichajesVacaciones.Domain.Entities;

public class AbsenceCalendar
{
    public int AbsenceId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public string AbsenceType { get; set; } = "VACATION"; // VACATION, OTHER
    public int? SourceRequestId { get; set; }

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public VacationRequests? SourceRequest { get; set; }
}