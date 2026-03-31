using System.Text.Json;
using System.Text.Json.Serialization;

namespace SistemaFichajesVacaciones.Api.JsonConverters;

/// <summary>
/// Custom JSON converter para TimeOnly que acepta formato "HH:mm" o "HH:mm:ss"
/// </summary>
public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private const string Format = "HH:mm:ss";
    private const string FormatHHmm = "HH:mm";

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            string? timeString = reader.GetString();
            if (string.IsNullOrEmpty(timeString))
                throw new JsonException("TimeOnly cannot be empty");

            // Intentar parsear como "HH:mm:ss" o "HH:mm"
            if (TimeOnly.TryParse(timeString, out var time))
                return time;

            throw new JsonException($"Unable to convert \"{timeString}\" to TimeOnly");
        }

        throw new JsonException($"Unexpected token {reader.TokenType} when parsing TimeOnly");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
    {
        // Serializar como "HH:mm:ss"
        writer.WriteStringValue(value.ToString(Format));
    }
}
