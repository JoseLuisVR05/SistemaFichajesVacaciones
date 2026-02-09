namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para crear una nueva solicitud de vacaciones
/// El empleado indica qué días quiere tomar
/// </summary>
public record CreateVacationRequestDto(
    DateTime StartDate,  // Primer día de vacaciones (inclusive)
    DateTime EndDate,    // Último día de vacaciones (inclusive)
    string? Type         // VACATION (normal), PERSONAL, OTHER
);

/// <summary>
/// DTO para aprobar/rechazar solicitudes
/// El comentario del aprobador es opcional en aprobación, obligatorio en rechazo
/// </summary>
public record ApproveRejectRequestDto(
    string Comment  // Ej: "Aprobado", "Rechazado por conflicto con proyecto X"
);

/// <summary>
/// DTO para validar fechas ANTES de crear la solicitud
/// Permite al frontend mostrar errores/warnings en tiempo real
/// </summary>
public record ValidateVacationDatesDto(
    DateTime StartDate,
    DateTime EndDate
);

/// <summary>
/// DTO de respuesta con el resultado de la validación
/// Usado tanto en preview como en creación real
/// </summary>
public record VacationValidationResultDto
{
    public bool IsValid { get; init; }              // ¿Se puede crear la solicitud?
    public decimal WorkingDays { get; init; }       // Días laborables en el rango
    public decimal AvailableDays { get; init; }     // Días disponibles del empleado
    public List<string> Errors { get; init; } = new();   // Errores bloqueantes
    public List<string> Warnings { get; init; } = new(); // Advertencias no bloqueantes
}

/// <summary>
/// DTO de respuesta con información completa de una solicitud
/// Incluye datos denormalizados para evitar múltiples queries en frontend
/// </summary>
public record VacationRequestResponseDto
{
    public int RequestId { get; init; }
    public int EmployeeId { get; init; }
    public string EmployeeName { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public decimal RequestedDays { get; init; }
    public string Type { get; init; } = "VACATION";
    public string Status { get; init; } = "DRAFT"; // DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
    public string? ApproverComment { get; init; }
    public DateTime? SubmittedAt { get; init; }    // ¿Cuándo lo envió el empleado?
    public DateTime? DecisionAt { get; init; }     // ¿Cuándo lo aprobaron/rechazaron?
    public DateTime CreatedAt { get; init; }
}