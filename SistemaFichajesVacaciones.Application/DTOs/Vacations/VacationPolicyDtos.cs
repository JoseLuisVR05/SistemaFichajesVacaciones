namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para crear una nueva política de vacaciones
/// Contiene validaciones de negocio básicas
/// </summary>
public record CreatePolicyDto(
    string Name,              // Nombre descriptivo: "Estándar España 2025"
    int Year,                 // Año fiscal de aplicación
    string? AccrualType,      // ANNUAL (una vez al año) o MONTHLY (mensual)
    decimal TotalDaysPerYear, // Días totales que otorga la política (ej: 22)
    decimal CarryOverMaxDays  // Máximo de días que se pueden arrastrar al año siguiente
);

/// <summary>
/// DTO para actualizar política existente
/// Todos los campos son opcionales (nullable)
/// Solo se actualizan los campos que vengan con valor
/// </summary>
public record UpdatePolicyDto(
    string? Name,              // Nuevo nombre (opcional)
    int? Year,                 // Cambiar año (raro, pero permitido)
    string? AccrualType,       // Cambiar tipo de acumulación
    decimal? TotalDaysPerYear, // Ajustar días totales
    decimal? CarryOverMaxDays  // Ajustar máximo arrastre
);