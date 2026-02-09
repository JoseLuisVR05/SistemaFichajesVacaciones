namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para asignar saldos masivamente a empleados
/// Usado cuando RRHH quiere dar vacaciones a todos los empleados activos
/// </summary>
public record BulkAssignBalanceDto(
    int PolicyId,  // ID de la política a aplicar (ej: "Estándar España 2025")
    int Year       // Año para el que se asignan los saldos
);

/// <summary>
/// DTO de respuesta cuando se consulta el saldo de un empleado
/// Incluye información calculada y denormalizada para el frontend
/// </summary>
public record VacationBalanceResponseDto
{
    public int BalanceId { get; init; }         // ID único del saldo
    public int EmployeeId { get; init; }        // ID del empleado
    public string EmployeeName { get; init; } = string.Empty; // Nombre completo
    public int Year { get; init; }              // Año del saldo
    public string? PolicyName { get; init; }    // Nombre de la política aplicada
    public decimal AllocatedDays { get; init; } // Días asignados (incluye arrastre)
    public decimal UsedDays { get; init; }      // Días ya consumidos/aprobados
    public decimal RemainingDays { get; init; } // Días disponibles = Allocated - Used
    public DateTime UpdatedAt { get; init; }    // Última actualización
}

/// <summary>
/// DTO para el resumen de saldos de un equipo/departamento
/// Usado en vistas de manager para ver estado de su equipo
/// </summary>
public record TeamBalanceDto
{
    public int EmployeeId { get; init; }
    public string EmployeeCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Department { get; init; }
    public int Year { get; init; }
    public decimal AllocatedDays { get; init; }
    public decimal UsedDays { get; init; }
    public decimal RemainingDays { get; init; }
    public string PolicyName { get; init; } = "Sin política";
}