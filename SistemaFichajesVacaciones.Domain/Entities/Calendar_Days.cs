namespace SistemaFichajesVacaciones.Domain.Entities;

public class Calendar_Days
{
    public DateTime Date { get; set; }
    public bool IsWeekend { get; set; }
    public bool IsHoliday { get; set; }
    public string? HolidayName { get; set; }
    public string? Region { get; set; }
    public string? Location { get; set; }
}