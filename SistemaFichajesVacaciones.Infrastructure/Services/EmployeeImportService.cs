using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface IEmployeeImportService
{
    Task<ImportRun> ImportFromCsvAsync(IFormFile file, CancellationToken cancellationToken = default);
}

public class EmployeeImportService : IEmployeeImportService
{
    private readonly AppDbContext _db;
    public EmployeeImportService(AppDbContext db) => _db = db;

    public async Task<ImportRun> ImportFromCsvAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null) throw new ArgumentNullException(nameof(file));

        var importRun = new ImportRun
        {
            FileName = file.FileName,
            ImportedAt = DateTime.UtcNow
        };

        _db.ImportRuns.Add(importRun);
        await _db.SaveChangesAsync(cancellationToken); // obtener ImportRunId

        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        string? header = await reader.ReadLineAsync();
        if (header == null)
        {
            importRun.ErrorRows = 1;
            _db.ImportRuns.Update(importRun);
            await _db.SaveChangesAsync(cancellationToken);
            return importRun;
        }

        // Asumimos CSV con ; o ,; hay que normalizar - ejemplo simple con split por ','.
        int row = 1;
        int success = 0, errors = 0;
        var stagingEntities = new List<EmployeesStaging>();

        while (!reader.EndOfStream)
        {
            row++;
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;

            // Split simple, mejorar si hay comillas/commas dentro
            var parts = line.Split(',');

            try
            {
                // Esperamos columnas: EmployeeCode,FullName,Email,Company,BusinessUnit,Department,ManagerEmployeeCode,IsActive,StartDate,EndDate
                var code = parts.Length > 0 ? parts[0].Trim() : null;
                var fullName = parts.Length > 1 ? parts[1].Trim() : null;
                var email = parts.Length > 2 ? parts[2].Trim() : null;
                var company = parts.Length > 3 ? parts[3].Trim() : null;
                var businessUnit = parts.Length > 4 ? parts[4].Trim() : null;
                var department = parts.Length > 5 ? parts[5].Trim() : null;
                var managerCode = parts.Length > 6 ? parts[6].Trim() : null;
                var isActive = true;
                if (parts.Length > 7 && bool.TryParse(parts[7].Trim(), out var parsedActive))
                    isActive = parsedActive;
                DateTime? startDate = null;
                if (parts.Length > 8 && DateTime.TryParse(parts[8].Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var sd))
                    startDate = sd;
                DateTime? endDate = null;
                if (parts.Length > 9 && DateTime.TryParse(parts[9].Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var ed))
                    endDate = ed;

                if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(fullName))
                    throw new Exception("EmployeeCode o FullName vacíos");

                var staging = new EmployeesStaging
                {
                    EmployeeCode = code!,
                    FullName = fullName!,
                    Email = email ?? string.Empty,
                    Company = company,
                    BusinessUnit = businessUnit,
                    Department = department,
                    ManagerEmployeeCode = managerCode,
                    IsActive = isActive,
                    StartDate = startDate,
                    EndDate = endDate,
                    ImportRunId = importRun.ImportRunId
                };
                stagingEntities.Add(staging);
                success++;
            }
            catch (Exception ex)
            {
                errors++;
                _db.ImportErrors.Add(new ImportError
                {
                    ImportRunId = importRun.ImportRunId,
                    RowNumber = row,
                    ErrorMessage = ex.Message
                });
            }
        }

        // Insertar a tabla staging en bloque
        if (stagingEntities.Any())
        {
            _db.EmployeesStaging.AddRange(stagingEntities);
            await _db.SaveChangesAsync(cancellationToken);
        }

        // Ahora aplicar upsert a Employees basado en EmployeeCode
        // NOTA: EF Core 10 admite ExecuteUpdate / ExecuteDelete; para upsert usaremos transacción y lógica: buscar por EmployeeCode y actualizar/insertar.
        using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Traer todos los staging de este import run
            var stagings = await _db.EmployeesStaging
                .Where(s => s.ImportRunId == importRun.ImportRunId)
                .ToListAsync(cancellationToken);
            //Precargar empleados en memoria
            var employeesByCode = await _db.Employees
                .ToDictionaryAsync(e => e.EmployeeCode, e => e.EmployeeId, cancellationToken);


            foreach (var s in stagings)
            {
                int? managerEmployeeId = null;

                if (!string.IsNullOrWhiteSpace(s.ManagerEmployeeCode) &&
                    employeesByCode.TryGetValue(s.ManagerEmployeeCode, out var mgrId))
                {
                    managerEmployeeId = mgrId;
                }

                var existing = await _db.Employees.SingleOrDefaultAsync(e => e.EmployeeCode == s.EmployeeCode, cancellationToken);
                if (existing != null)
                {
                    existing.FullName = s.FullName ?? existing.FullName;
                    existing.Email = s.Email ?? existing.Email;
                    existing.Company = s.Company ?? existing.Company;
                    existing.BusinessUnit = s.BusinessUnit ?? existing.BusinessUnit;
                    existing.Department = s.Department ?? existing.Department;
                    existing.ManagerEmployeeId = managerEmployeeId;
                    existing.IsActive = s.IsActive;
                    existing.StartDate = s.StartDate ?? existing.StartDate;
                    existing.EndDate = s.EndDate ?? existing.EndDate;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newEmp = new Employee
                    {
                        EmployeeCode = s.EmployeeCode ?? string.Empty,
                        FullName = s.FullName ?? string.Empty,
                        Email = s.Email ?? string.Empty,
                        Company = s.Company,
                        BusinessUnit = s.BusinessUnit,
                        Department = s.Department,
                        ManagerEmployeeId = managerEmployeeId,
                        IsActive = s.IsActive,
                        StartDate = s.StartDate,
                        EndDate = s.EndDate,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.Employees.Add(newEmp);
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            // Si el proceso requiere gestionar bajas marcando IsActive=0 para empleados no presentes,
            // hacerlo con lógica adicional (comentar o habilitar según política).
            // Ejemplo (opcional):
            // var incomingCodes = stagings.Select(s=>s.EmployeeCode).Where(c=>c!=null).ToList();
            // var toDeactivate = _db.Employees.Where(e => !incomingCodes.Contains(e.EmployeeCode) && e.IsActive);
            // foreach (var e in toDeactivate) e.IsActive = false;

            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _db.ImportErrors.Add(new ImportError
            {
                ImportRunId = importRun.ImportRunId,
                RowNumber = 0,
                ErrorMessage = $"Error durante upsert: {ex.Message}"
            });
            await _db.SaveChangesAsync(cancellationToken);
        }

        // Actualiza counters del importRun
        importRun.TotalRows = success + errors;
        importRun.SuccessRows = success;
        importRun.ErrorRows = errors;
        _db.ImportRuns.Update(importRun);
        await _db.SaveChangesAsync(cancellationToken);

        return importRun;
    }
}