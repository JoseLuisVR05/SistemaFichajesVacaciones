namespace SistemaFichajesVacaciones.Domain.Entities;

public class TimeDailySummary
{
    public int SummaryId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; } // Solo fecha (sin hora)
    public int WorkedMinutes { get; set; } // Minutos trabajados
    public int ExpectedMinutes { get; set; } = 480; // 8 horas por defecto
    public int BalanceMinutes { get; private set; } 
    public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;

    // Navegación
    public Employee Employee { get; set; } = null!;
}