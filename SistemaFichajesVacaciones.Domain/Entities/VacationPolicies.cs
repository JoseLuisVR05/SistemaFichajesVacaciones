namespace SistemaFichajesVacaciones.Domain.Entities;

public class VacationPolicies
{
    public int PolicyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Year { get; set; }
    public string AccrualType { get; set; } = "ANNUAL"; // ANNUAL, MONTHLY
    public decimal TotalDaysPerYear { get; set; }
    public decimal CarryOverMaxDays { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Employee_VacationBalance> VacationBalances { get; set; } 
        = new List<Employee_VacationBalance>();
}
