namespace SistemaFichajesVacaciones.Domain.Entities;

public class TimeEntry
{
    public int TimeEntryId { get; set; }
    public int EmployeeId { get; set; }
    public string EntryType { get; set; } = string.Empty; // IN, OUT, ADJUSTMENT
    public DateTime EventTime { get; set; }
    public string Source { get; set; } = string.Empty; // WEB, MOBILE, ADMIN
    public string? GeoLocation { get; set; }
    public string? DeviceId { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public int CreatedByUserId { get; set; }

    // Navegación
    public Employee Employee { get; set; } = null!;
}