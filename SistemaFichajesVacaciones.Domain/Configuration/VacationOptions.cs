namespace SistemaFichajesVacaciones.Domain.Configuration;

public class VacationOptions
{
    public const string SectionName = "Vacations";

    public int ConsecutiveDaysWarningThreshold { get; set; } = 15;
    public int PastRequestMarginDays { get; set; } = 1;
}
