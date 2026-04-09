namespace SistemaFichajesVacaciones.Application.DTOs.Auth;

/// <summary>
/// DTO para la petición de inicio de sesión
/// </summary>
public record LoginDto(string Email, string Password);
