using Serilog.Context;

namespace NexusHR.Api.Middleware;

public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-ID";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Reusar el ID si el cliente lo envía (útil cuando el frontend reintenta una petición)
        // Si no viene, generamos uno nuevo
        var correlationId = context.Request.Headers[CorrelationIdHeader].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        // Devolver el ID en la respuesta para que el frontend pueda incluirlo en reportes de error
        context.Response.Headers[CorrelationIdHeader] = correlationId;

        // Añadir al LogContext de Serilog: todos los logs de esta petición llevarán este ID
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}
