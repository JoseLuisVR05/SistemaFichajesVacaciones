using System.ComponentModel.DataAnnotations;

namespace SistemaFichajesVacaciones.Application.DTOs.TimeControl;

/// <summary>
/// DTO para registrar una entrada o salida manual desde la app
/// </summary>
public class RegisterEntryDto
{
    /// <summary>Tipo de fichaje: IN, OUT, o vacío (lo deduce el sistema por posición)</summary>
    [StringLength(3, ErrorMessage = "EntryType no puede superar 3 caracteres")]
    public string? EntryType { get; set; }

    /// <summary>Comentario opcional del empleado</summary>
    [StringLength(500, ErrorMessage = "El comentario no puede superar 500 caracteres")]
    public string? Comment { get; set; }
}
