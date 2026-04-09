using Xunit;
using SistemaFichajesVacaciones.Domain.Constants;
using SistemaFichajesVacaciones.Domain.Entities;
using SistemaFichajesVacaciones.Tests.Helpers;

namespace SistemaFichajesVacaciones.Tests;

/// <summary>
/// Tests unitarios para VacationRequestService.ValidateRequestAsync.
///
/// Cada test usa su propia base de datos en memoria con nombre único,
/// por lo que son completamente independientes entre sí.
///
/// ESTRUCTURA de cada test (patrón AAA):
///   Arrange → preparar datos y dependencias
///   Act     → llamar al método que queremos probar
///   Assert  → verificar que el resultado es el esperado
/// </summary>
public class VacationRequestServiceTests
{
    // Devuelve el próximo lunes (nunca hoy, siempre futuro)
    private static DateTime ProximoLunes()
    {
        var hoy = DateTime.UtcNow.Date;
        int diasHastaLunes = ((int)DayOfWeek.Monday - (int)hoy.DayOfWeek + 7) % 7;
        if (diasHastaLunes == 0) diasHastaLunes = 7;
        return hoy.AddDays(diasHastaLunes);
    }

    // ── TEST 1 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_FechasValidasConSaldo_DevuelveIsValidTrue()
    {
        // Arrange: empleado con 20 días de saldo, pide lunes a viernes (5 días)
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_FechasValidasConSaldo_DevuelveIsValidTrue));
        await TestDbFactory.SeedBasicDataAsync(db, remainingDays: 20);

        var lunes = ProximoLunes();
        var viernes = lunes.AddDays(4);

        // Act
        var result = await service.ValidateRequestAsync(1, lunes, viernes);

        // Assert
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
        Assert.Equal(5, result.WorkingDays);
    }

    // ── TEST 2 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_SaldoInsuficiente_DevuelveError()
    {
        // Arrange: empleado con solo 2 días, pide 5 días (lunes a viernes)
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_SaldoInsuficiente_DevuelveError));
        await TestDbFactory.SeedBasicDataAsync(db, remainingDays: 2);

        var lunes = ProximoLunes();
        var viernes = lunes.AddDays(4);

        // Act
        var result = await service.ValidateRequestAsync(1, lunes, viernes);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("Saldo insuficiente"));
        Assert.Equal(2, result.AvailableDays);
    }

    // ── TEST 3 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_SolapamientoConSolicitudExistente_DevuelveError()
    {
        // Arrange: ya existe una solicitud activa para esa semana
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_SolapamientoConSolicitudExistente_DevuelveError));
        await TestDbFactory.SeedBasicDataAsync(db, remainingDays: 20);

        var lunes = ProximoLunes();
        var viernes = lunes.AddDays(4);

        db.VacationRequests.Add(new VacationRequests
        {
            RequestId = 1,
            EmployeeId = 1,
            StartDate = lunes,
            EndDate = viernes,
            RequestedDays = 5,
            Status = VacationStatus.Submitted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        // Act: intentar pedir exactamente las mismas fechas
        var result = await service.ValidateRequestAsync(1, lunes, viernes);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("solapamiento"));
    }

    // ── TEST 4 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_SoloFinDeSemana_DevuelveWarningYCeroDiasLaborables()
    {
        // Arrange: pedir solo sábado y domingo
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_SoloFinDeSemana_DevuelveWarningYCeroDiasLaborables));
        await TestDbFactory.SeedBasicDataAsync(db, remainingDays: 20);

        var hoy = DateTime.UtcNow.Date;
        int diasHastaSabado = ((int)DayOfWeek.Saturday - (int)hoy.DayOfWeek + 7) % 7;
        if (diasHastaSabado == 0) diasHastaSabado = 7;
        var sabado = hoy.AddDays(diasHastaSabado);
        var domingo = sabado.AddDays(1);

        // Act
        var result = await service.ValidateRequestAsync(1, sabado, domingo);

        // Assert
        Assert.Equal(0, result.WorkingDays);
        Assert.Contains(result.Warnings, w => w.Contains("no incluye días laborables"));
    }

    // ── TEST 5 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_FechasEnElPasado_DevuelveError()
    {
        // Arrange: pedir vacaciones que empezaron hace 30 días
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_FechasEnElPasado_DevuelveError));
        await TestDbFactory.SeedBasicDataAsync(db);

        var haceUnMes = DateTime.UtcNow.Date.AddDays(-30);
        var haceVeinticinco = haceUnMes.AddDays(4);

        // Act
        var result = await service.ValidateRequestAsync(1, haceUnMes, haceVeinticinco);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("fechas pasadas"));
    }

    // ── TEST 6 ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidarSolicitud_FinAnteriorAlInicio_DevuelveError()
    {
        // Arrange: endDate antes que startDate (error de formulario)
        var (service, db) = TestDbFactory.CreateService(
            nameof(ValidarSolicitud_FinAnteriorAlInicio_DevuelveError));
        await TestDbFactory.SeedBasicDataAsync(db);

        var lunes = ProximoLunes();
        var antesDelLunes = lunes.AddDays(-2); // endDate < startDate

        // Act
        var result = await service.ValidateRequestAsync(1, lunes, antesDelLunes);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("anterior a la fecha de inicio"));
    }
}
