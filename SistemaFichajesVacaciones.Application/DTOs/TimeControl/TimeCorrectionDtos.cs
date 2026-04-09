namespace SistemaFichajesVacaciones.Application.DTOs.TimeControl;

/// <summary>
/// DTO para crear una nueva solicitud de corrección de tiempo
/// </summary>
public record CreateCorrectionDto(DateTime Date, int CorrectedMinutes, string Reason);

/// <summary>
/// DTO para actualizar una corrección existente (en estado borrador)
/// </summary>
public record UpdateCorrectionDto(int CorrectedMinutes, string Reason);

/// <summary>
/// DTO para rechazar una solicitud de corrección con un motivo
/// </summary>
public record RejectCorrectionDto(string RejectionReason);
