namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para crear una nueva política de vacaciones
/// </summary>
public class CreatePolicyDto
{
    public string Name { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? AccrualType { get; set; }
    public decimal TotalDaysPerYear { get; set; }
    public decimal CarryOverMaxDays { get; set; }
}

/// <summary>
/// DTO para actualizar política existente
/// Todos los campos son opcionales
/// </summary>
public class UpdatePolicyDto
{
    public string? Name { get; set; }
    public int? Year { get; set; }
    public string? AccrualType { get; set; }
    public decimal? TotalDaysPerYear { get; set; }
    public decimal? CarryOverMaxDays { get; set; }
}