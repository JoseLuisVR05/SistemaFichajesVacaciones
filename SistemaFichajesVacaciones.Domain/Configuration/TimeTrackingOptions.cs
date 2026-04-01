namespace SistemaFichajesVacaciones.Domain.Configuration;

public class TimeTrackingOptions
{
    public const string SectionName = "TimeTracking";

    public int DefaultWorkdayMinutes { get; set; } = 480;
    public string DefaultWorkdayEnd { get; set; } = "18:00";
    public int DefaultQueryRangeDays { get; set; } = 30;
}
