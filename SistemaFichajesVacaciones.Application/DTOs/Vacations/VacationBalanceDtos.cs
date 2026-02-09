namespace SistemaFichajesVacaciones.Application.DTOs.Vacations;

/// <summary>
/// DTO para asignar saldos masivamente a empleados
/// </summary>
public class BulkAssignBalanceDto
{
    public int PolicyId { get; set; }
    public int Year { get; set; }
}

/// <summary>
/// DTO de respuesta cuando se consulta el saldo de un empleado
/// </summary>
public class VacationBalanceResponseDto
{
    public int BalanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? PolicyName { get; set; }
    public decimal AllocatedDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal RemainingDays { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO para el resumen de saldos de un equipo
/// </summary>
public class TeamBalanceDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public int Year { get; set; }
    public decimal AllocatedDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal RemainingDays { get; set; }
    public string PolicyName { get; set; } = "Sin política";
}