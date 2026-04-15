using System.Net;
using System.Text.Json;

namespace NexusHR.Api.Middleware;

/// <summary>
/// Middleware global para capturar todas las excepciones no manejadas
/// y devolver respuestas consistentes al cliente en formato JSON.
/// 
/// Beneficios:
/// - Respuestas consistentes
/// - Log centralizado de errores
/// - No expone stack traces en producción
/// - Manejo automático de tipos de error comunes
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Se produjo una excepción no manejada: {ExceptionMessage}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Timestamp = DateTime.UtcNow,
            TraceId = context.TraceIdentifier
        };

        // ✅ Revisar primero los casos específicos (con condiciones)
        if (exception is InvalidOperationException invOpEx && exception.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            response.StatusCode = 409;
            response.Message = "Recurso duplicado";
            response.Details = invOpEx.Message;
        }
        // ✅ Luego los casos generales (sin condiciones)
        else if (exception is ArgumentException argEx)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            response.StatusCode = 400;
            response.Message = "Parámetro inválido";
            response.Details = argEx.Message;
        }
        else if (exception is InvalidOperationException invOpExGeneral)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            response.StatusCode = 400;
            response.Message = "Operación inválida";
            response.Details = invOpExGeneral.Message;
        }
        else if (exception is UnauthorizedAccessException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            response.StatusCode = 401;
            response.Message = "No autorizado";
            response.Details = "No tienes permisos para realizar esta acción";
        }
        else if (exception is KeyNotFoundException keyEx)
        {
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            response.StatusCode = 404;
            response.Message = "Recurso no encontrado";
            response.Details = keyEx.Message;
        }
        else
        {
            // Error no esperado (500)
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            response.StatusCode = 500;
            response.Message = "Error interno del servidor";
            response.Details = exception.GetType().Name;
        }

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsJsonAsync(response, options);
    }
}

/// <summary>
/// Respuesta estándar para errores API
/// </summary>
public class ErrorResponse
{
    public int StatusCode { get; set; }
    public string? Message { get; set; }
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
    public string? TraceId { get; set; }
}
