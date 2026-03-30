namespace SistemaFichajesVacaciones.Domain.Entities;

public class TERMINALESals
{
    public string Codigo { get; set; } = string.Empty;  // PK - CHAR(2)
    
    public byte? Tipo { get; set; }
    
    public byte? Modelo { get; set; }
    
    public string? Descripcion { get; set; }  // Ej: 'BCN CENTRAL', 'PUNE TECHPARK'
    
    public string? IP { get; set; }
    
    public string? Puerto { get; set; }
    
    public bool? Ethernet { get; set; }
    
    public bool? Workcode { get; set; }
    
    public byte? TipoAutentificacion { get; set; }
    
    public int? TiempoAperturaPuerta { get; set; }
    
    public string? NumeroSerie { get; set; }
    
    public int? UTC { get; set; }
    
    // ✨ NUEVA COLUMNA: FK a Territory
    public int? TerritoryId { get; set; }
    
    // Navegación
    public Territory? Territory { get; set; }
}
