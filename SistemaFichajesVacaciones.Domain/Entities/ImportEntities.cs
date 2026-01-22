namespace SistemaFichajesVacaciones.Domain.Entities
{
    public class EmployeesStaging
    {
        public int StagingId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Company { get; set; }
        public string? BusinessUnit { get; set; }
        public string? Department { get; set; }
        public string? ManagerEmployeeCode { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? ImportRunId { get; set; }
        public ImportRun? ImportRun { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ImportRun
    {
        public int ImportRunId { get; set; }
        public string? FileName { get; set; }
        public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
        public int TotalRows { get; set; }
        public int SuccessRows { get; set; }
        public int ErrorRows { get; set; }
        public ICollection<ImportError> Errors { get; set; } = new List<ImportError>();
    }

    public class ImportError
    {
        public int ErrorId { get; set; }
        public int ImportRunId { get; set; }
        public ImportRun? ImportRun { get; set; }
        public int RowNumber { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}