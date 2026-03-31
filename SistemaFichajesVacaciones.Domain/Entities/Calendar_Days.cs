namespace SistemaFichajesVacaciones.Domain.Entities;

public class Calendar_Days
{
    public DateTime Date { get; set; }  // Parte de PK compuesta
    
    public int CalendarTemplateId { get; set; }  // FK → CalendarTemplate (PK compuesta: CalendarTemplateId + Date)
    
    public bool IsWeekend { get; set; }
    
    public bool IsHoliday { get; set; }
    
    public string? HolidayName { get; set; }
    
    public bool IsGlobal { get; set; } = false;  // Si true, aplica a TODOS los empleados (1 ene, 25 dic, etc)
    
    // Navegación
    public CalendarTemplate? CalendarTemplate { get; set; }
}