namespace SistemaFichajesVacaciones.Domain.Entities;

public class VacationRequest_Days
{
    public int RequestDayId { get; set; }
    public int RequestId { get; set; }
    public DateTime Date { get; set; }
    public decimal DayFraction { get; set; } = 1.0m; // 1.0 = día completo, 0.5 = medio día
    public bool IsHolidayOrWeekend { get; set; } = false;

    // Navigation properties
    public VacationRequests Request { get; set; } = null!;
}
