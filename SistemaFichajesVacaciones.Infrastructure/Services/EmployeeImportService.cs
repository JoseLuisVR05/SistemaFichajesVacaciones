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
    private string[] ParseCsvLine(string line)// metodo simple para parsear una línea CSV
    {
        // Manejo simple de CSV
        return line.Split(new[] { ',' }, StringSplitOptions.None);
    }
    private readonly AppDbContext _db;
    public EmployeeImportService(AppDbContext db) => _db = db;

    public async Task<ImportRun> ImportFromCsvAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null) throw new ArgumentNullException(nameof(file));

        using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var importRun = new ImportRun
        {
            FileName = file.FileName,
            ImportedAt = DateTime.UtcNow,
            Status = "In Progress"
        };
            

        _db.ImportRuns.Add(importRun);
        await _db.SaveChangesAsync(cancellationToken); // obtener ImportRunId

        // Procesar el archivo CSV
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);

        string? header = await reader.ReadLineAsync();
        if (header == null)
        {
            importRun.ErrorRows = 1;
            importRun.Status = "Failed";
            _db.ImportRuns.Update(importRun);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return importRun;
        }

        // Asumimos CSV con ; o ,; hay que normalizar - ejemplo simple con split por ','.
        int row = 1;
        int success = 0, errors = 0;
        var stagingEntities = new List<EmployeesStaging>();
        var ImportErrors = new List<ImportError>();

        var existingEmployeeCodes = (await _db.Employees
            .Select(e => e.EmployeeCode)
            .Distinct()
            .ToListAsync(cancellationToken))
            .ToHashSet();

        while (!reader.EndOfStream)
        {
            row++;
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                
                 var parts = ParseCsvLine(line);
                
                // Validaciones básicas
                if (parts.Length < 2)
                    throw new Exception("Fila no contiene suficientes columnas");

                var code = parts[0]?.Trim(); // Trim elimina espacios en blancos
                var fullName = parts[1]?.Trim();

                // Validaciones de negocio
                if (string.IsNullOrEmpty(code))
                    throw new Exception("EmployeeCode es requerido");
                    
                if (string.IsNullOrEmpty(fullName))
                    throw new Exception("FullName es requerido");

                if (code.Length > 50)
                    throw new Exception("EmployeeCode no puede exceder 50 caracteres");
                
                // Esperamos columnas: EmployeeCode,FullName,Email,Company,BusinessUnit,Department,ManagerEmployeeCode,IsActive,StartDate,EndDate
                var email = parts.Length > 2 ? parts[2].Trim() : null;
                var company = parts.Length > 3 ? parts[3].Trim() : null;
                var businessUnit = parts.Length > 4 ? parts[4].Trim() : null;
                var department = parts.Length > 5 ? parts[5].Trim() : null;
                
                var managerCode = parts.Length > 6 ? parts[6].Trim() : null;
                // Validar que manager exista (si se proporciona)
                if (!string.IsNullOrEmpty(managerCode) && !existingEmployeeCodes.Contains(managerCode))
                {
                    throw new Exception($"Manager con código '{managerCode}' no existe en el sistema");
                }
                
                bool isActive = true;
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
                    ImportRunId = importRun.ImportRunId,
                    CreatedAt = DateTime.UtcNow
                };
                stagingEntities.Add(staging);
                success++;
            }
            catch (Exception ex)
            {
                errors++;

                ImportErrors.Add(new ImportError
                {
                    ImportRunId = importRun.ImportRunId,
                    RowNumber = row,
                    ErrorMessage = ex.Message,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Insertar a tabla staging en bloque
        if (stagingEntities.Any())
        {
            await _db.EmployeesStaging.AddRangeAsync(stagingEntities, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        // Guardar errores
        if (ImportErrors.Any())
        {
            await _db.ImportErrors.AddRangeAsync(ImportErrors, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var stagingData = await _db.EmployeesStaging
            .Where(s => s.ImportRunId == importRun.ImportRunId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var existingEmployees = await _db.Employees
            .Where(e => stagingData.Select(s => s.EmployeeCode).Contains(e.EmployeeCode))
            .ToDictionaryAsync(e => e.EmployeeCode, cancellationToken);

        var newEmployees = new List<Employee>();
        var employeesToUpdate = new List<Employee>();

        // Aplicar upsert a Employees basado en EmployeeCode
        
           foreach (var staging in stagingData)
        {
            if (string.IsNullOrEmpty(staging.EmployeeCode))
                continue;

            if (existingEmployees.TryGetValue(staging.EmployeeCode, out var existing))
            {
                // Actualizar empleado existente
                existing.FullName = staging.FullName ?? existing.FullName;
                existing.Email = staging.Email ?? existing.Email;
                existing.Company = staging.Company ?? existing.Company;
                existing.BusinessUnit = staging.BusinessUnit ?? existing.BusinessUnit;
                existing.Department = staging.Department ?? existing.Department;
                existing.IsActive = staging.IsActive;
                existing.StartDate = staging.StartDate ?? existing.StartDate;
                existing.EndDate = staging.EndDate ?? existing.EndDate;
                existing.UpdatedAt = DateTime.UtcNow;
                
                employeesToUpdate.Add(existing);
            }
            else
            {
                // Crear nuevo empleado
                var newEmployee = new Employee
                {
                    EmployeeCode = staging.EmployeeCode,
                    FullName = staging.FullName ?? string.Empty,
                    Email = staging.Email ?? string.Empty,
                    Company = staging.Company,
                    BusinessUnit = staging.BusinessUnit,
                    Department = staging.Department,
                    IsActive = staging.IsActive,
                    StartDate = staging.StartDate,
                    EndDate = staging.EndDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                newEmployees.Add(newEmployee);
            }
        }
        // Insertar nuevos empleados
        if (newEmployees.Any())
        {
            await _db.Employees.AddRangeAsync(newEmployees, cancellationToken);
        }
            await _db.SaveChangesAsync(cancellationToken);

        // Actualizar relaciones de managers
        // Necesitamos recargar los IDs después del save
            var allEmployeeCodes = stagingData
                .Select(s => s.EmployeeCode)
                .Concat(stagingData.Where(s => !string.IsNullOrEmpty(s.ManagerEmployeeCode))
                               .Select(s => s.ManagerEmployeeCode))
                .Distinct()
                .Where(c => !string.IsNullOrEmpty(c))
                .ToList();

            var employeeIdMap = await _db.Employees
                .Where(e => allEmployeeCodes.Contains(e.EmployeeCode))
                .ToDictionaryAsync(e => e.EmployeeCode!, e => e.EmployeeId, cancellationToken);
    
            // Ahora que todos existen, refrescamos el diccionario de códigos a IDs
             
            foreach (var staging in stagingData)
        {
            if (string.IsNullOrEmpty(staging.EmployeeCode) || string.IsNullOrEmpty(staging.ManagerEmployeeCode))
                continue;

            if (employeeIdMap.TryGetValue(staging.EmployeeCode, out var employeeId) &&
                employeeIdMap.TryGetValue(staging.ManagerEmployeeCode, out var managerId))
            {
                var employee = await _db.Employees.FindAsync(new object[] { employeeId }, cancellationToken);
                if (employee != null && employee.ManagerEmployeeId != managerId)
                {
                    employee.ManagerEmployeeId = managerId;
                    employee.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Actualiza counters del importRun
        importRun.TotalRows = success + errors;
        importRun.SuccessRows = success;
        importRun.ErrorRows = errors;
        importRun.Status =  "Completed";
        _db.ImportRuns.Update(importRun);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return importRun;
    }
    catch (Exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}