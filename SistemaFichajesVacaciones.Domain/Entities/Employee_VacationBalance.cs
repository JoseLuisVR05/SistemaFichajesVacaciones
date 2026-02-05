namespace SistemaFichajesVacaciones.Domain.Entities;
public class Employee_VacationBalance
{
    public int BalanceId { get; set; }
    public int EmployeeId { get; set; }
    public int PolicyId { get; set; }
    public int Year { get; set; }
    public decimal AllocatedDays { get; set; }
    public decimal UsedDays { get; set; } = 0;
    public decimal RemainingDays { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    // Navigation properties
    public Employee Employee { get; set; } = null!;
    public VacationPolicies Policy { get; set; } = null!;
}