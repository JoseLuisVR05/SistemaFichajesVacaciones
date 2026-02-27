using System.ComponentModel.DataAnnotations.Schema;

namespace SistemaFichajesVacaciones.Domain.Entities;

public class TimeDailySummary
{
    public int SummaryId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; } // Solo fecha (sin hora)
    public int WorkedMinutes { get; set; } // Minutos trabajados
    public int ExpectedMinutes { get; set; } = 480; // 8 horas por defecto
    public int BalanceMinutes { get; set; } 
    public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;

    // Navegación
    public Employee Employee { get; set; } = null!;

    // No se persisten en BD — solo se usan en memoria tras el cálculo
    [NotMapped] public string? IncidentType { get; set; } // NO_ENTRIES | UNCLOSED_ENTRY | INCOMPLETE
    [NotMapped] public bool HasOpenEntry { get; set; }
}