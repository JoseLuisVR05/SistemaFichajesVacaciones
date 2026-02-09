namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para crear una nueva solicitud de vacaciones
/// </summary>
public class CreateVacationRequestDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Type { get; set; }
}

/// <summary>
/// DTO para aprobar/rechazar solicitudes
/// </summary>
public class ApproveRejectRequestDto
{
    public string Comment { get; set; } = string.Empty;
}

/// <summary>
/// DTO para validar fechas ANTES de crear la solicitud
/// </summary>
public class ValidateVacationDatesDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

/// <summary>
/// DTO de respuesta con el resultado de la validación
/// </summary>
public class VacationValidationResultDto
{
    public bool IsValid { get; set; }
    public decimal WorkingDays { get; set; }
    public decimal AvailableDays { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// DTO de respuesta con información completa de una solicitud
/// </summary>
public class VacationRequestResponseDto
{
    public int RequestId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal RequestedDays { get; set; }
    public string Type { get; set; } = "VACATION";
    public string Status { get; set; } = "DRAFT";
    public string? ApproverComment { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? DecisionAt { get; set; }
    public DateTime CreatedAt { get; set; }
}