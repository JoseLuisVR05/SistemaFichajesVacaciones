using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SistemaFichajesVacaciones.Application.Services;
using SistemaFichajesVacaciones.Domain.Configuration;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Infrastructure;

namespace SistemaFichajesVacaciones.Tests.Helpers;

/// <summary>
/// Factoría que crea instancias del servicio con una base de datos en memoria.
/// Cada test recibe su propia BD aislada (gracias al dbName único) para que
/// los datos de un test no interfieran con los de otro.
/// </summary>
public static class TestDbFactory
{
    /// <summary>
    /// Crea un AppDbContext que vive en memoria durante el test.
    /// Se destruye automáticamente al terminar el proceso.
    /// </summary>
    public static AppDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new AppDbContext(options);
    }

    /// <summary>
    /// Crea el VacationRequestService con todas sus dependencias reales
    /// pero apuntando a la BD en memoria.
    /// </summary>
    public static (VacationRequestService service, AppDbContext db) CreateService(
        string dbName, VacationOptions? options = null)
    {
        var db = CreateInMemoryDb(dbName);

        var vacationOptions = Options.Create(options ?? new VacationOptions
        {
            PastRequestMarginDays = 1,
            ConsecutiveDaysWarningThreshold = 15
        });

        var balanceService = new VacationBalanceService(db);
        var service = new VacationRequestService(db, balanceService, vacationOptions);

        return (service, db);
    }

    /// <summary>
    /// Siembra los datos mínimos necesarios para que la validación funcione:
    /// un territorio, un empleado vinculado a ese territorio, una política de
    /// vacaciones del año actual y el saldo correspondiente al empleado.
    /// </summary>
    public static async Task SeedBasicDataAsync(AppDbContext db, decimal remainingDays = 20m)
    {
        var year = DateTime.UtcNow.Year;

        db.Territories.Add(new Territory
        {
            TerritoryId = 1,
            CountryCode = "ES",
            CountryName = "España",
            UTC = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        db.Employees.Add(new Employee
        {
            EmployeeId = 1,
            EmployeeCode = "EMP001",
            FullName = "Empleado Test",
            Email = "test@empresa.com",
            TerritoryId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        db.VacationPolicies.Add(new VacationPolicies
        {
            PolicyId = 1,
            Name = "Política General",
            Year = year,
            TotalDaysPerYear = 22,
            CarryOverMaxDays = 5
        });

        db.EmployeeVacationBalances.Add(new Employee_VacationBalance
        {
            BalanceId = 1,
            EmployeeId = 1,
            PolicyId = 1,
            Year = year,
            AllocatedDays = 22,
            UsedDays = 22 - remainingDays,
            RemainingDays = remainingDays,
            UpdatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
    }
}
