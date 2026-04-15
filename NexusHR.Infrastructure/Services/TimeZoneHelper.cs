using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Services;

public static class TimeZoneHelper
{
    // Mapa de CountryCode → Windows TimeZone ID
    // TimeZoneInfo gestiona DST automáticamente (ej: España +1 invierno, +2 verano)
    private static readonly Dictionary<string, string> CountryToWindowsTzId = new()
    {
        { "ES", "Romance Standard Time" },   // España: UTC+1/+2 (con DST)
        { "IN", "India Standard Time" },      // India: UTC+5:30 (sin DST)
        { "MA", "Morocco Standard Time" },    // Marruecos
        { "GB", "GMT Standard Time" },        // Reino Unido
        { "DE", "W. Europe Standard Time" },  // Alemania
        { "FR", "Romance Standard Time" },    // Francia
        { "PT", "GMT Standard Time" },        // Portugal
        { "IT", "W. Europe Standard Time" },  // Italia
    };

    /// <summary>
    /// Devuelve la hora actual en la zona horaria del territorio del empleado.
    /// Maneja DST automáticamente. Fallback a UTC+offset si el país no está mapeado.
    /// </summary>
    public static DateTime GetTerritoryNow(Territory? territory)
    {
        if (territory == null) return DateTime.Now;

        if (CountryToWindowsTzId.TryGetValue(territory.CountryCode, out var tzId))
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
            catch { /* timezone no encontrado en este SO */ }
        }

        // Fallback: offset numérico del territorio
        return DateTime.UtcNow.AddHours(territory.UTC);
    }
}
