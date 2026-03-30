namespace SistemaFichajesVacaciones.Domain.Entities;

public class CalendarTemplate
{
    public int CalendarTemplateId { get; set; }
    
    public int TerritoryId { get; set; }  // FK → Territory
    
    public string Name { get; set; } = string.Empty;  // 'Calendario España 2026'
    
    public int Year { get; set; }  // 2026, 2027...
    
    // ▶ JERARQUÍA DE CALENDARIOS
    public string Level { get; set; } = "NATIONAL";  // NATIONAL | REGIONAL | CITY
    
    public string? RegionCode { get; set; }  // nullable: CAT, MAD, MH, TG, etc
    
    public string? CityCode { get; set; }  // nullable: BCN, MAD, MUM, HYD, etc
    
    public bool IsDefault { get; set; } = false;  // Default para territorio?
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navegación
    public ICollection<Calendar_Days> CalendarDays { get; set; } = new List<Calendar_Days>();
}
