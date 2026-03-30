namespace SistemaFichajesVacaciones.Application.DTOs;

/// <summary>
/// Plantilla de calendario (Define festivos por territorio/región)
/// </summary>
public class CalendarTemplateDto
{
    public int CalendarTemplateId { get; set; }
    public int TerritoryId { get; set; }
    
    /// <summary>Año del calendario</summary>
    public int Year { get; set; }
    
    /// <summary>Nivel: NATIONAL, REGIONAL, CITY</summary>
    public string Level { get; set; } = "NATIONAL";
    
    /// <summary>Nombre descriptivo</summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>¿Es el calendario default del territorio?</summary>
    public bool IsDefault { get; set; }
    
    /// <summary>Activo/Inactivo</summary>
    public bool IsActive { get; set; }
    
    /// <summary>Días del calendario (festivos, normales, etc)</summary>
    public List<CalendarDayDto> Days { get; set; } = new();
}

/// <summary>
/// Día del calendario con información de festivos
/// </summary>
public class CalendarDayDto
{
    public DateTime Date { get; set; }
    
    /// <summary>¿Es fin de semana?</summary>
    public bool IsWeekend { get; set; }
    
    /// <summary>¿Es festivo?</summary>
    public bool IsHoliday { get; set; }
    
    /// <summary>Nombre del festivo (si aplica)</summary>
    public string? HolidayName { get; set; }
}
