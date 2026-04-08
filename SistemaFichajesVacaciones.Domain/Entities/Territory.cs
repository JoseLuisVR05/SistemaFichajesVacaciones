namespace SistemaFichajesVacaciones.Domain.Entities;

public class Territory
{
    public int TerritoryId { get; set; }
    
    // Geografía
    public string CountryCode { get; set; } = string.Empty;  // 'ES', 'IN'
    public string CountryName { get; set; } = string.Empty;  // 'España', 'India'
    public string? Location { get; set; }                        // 'Cataluña', 'Maharashtra' (opcional)
    
    // Zona horaria
    public double UTC { get; set; }  // Offset en horas: 1=España invierno, 2=España verano, 5.5=India IST
    
    // Estado
    public bool IsActive { get; set; } = true;
    
    // Auditoría
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
