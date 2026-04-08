using Serilog;
using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using SistemaFichajesVacaciones.Domain.Configuration;
using SistemaFichajesVacaciones.Application.Interfaces;
using SistemaFichajesVacaciones.Application.Services;
using SistemaFichajesVacaciones.Api.JsonConverters;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;


var builder = WebApplication.CreateBuilder(args);

// Activar Serilog leyendo configuración desde appsettings.json
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// Options
builder.Services.Configure<TimeTrackingOptions>(builder.Configuration.GetSection(TimeTrackingOptions.SectionName));
builder.Services.Configure<VacationOptions>(builder.Configuration.GetSection(VacationOptions.SectionName));
builder.Services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Aqui se añaden los servicios
builder.Services.AddControllers()
.AddJsonOptions(options =>
    {
        // Esta opción ignora los ciclos y simplemente deja en 'null' la referencia repetida
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        // Convertir propiedades a camelCase en JSON (estándar web)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Agregar converter personalizado para TimeOnly
        options.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
    });
    
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    { 
        Title = "Sistema de Fichajes y Vacaciones API", 
        Version = "v1",
        Description = "API para gestión de fichajes y vacaciones",
        Contact = new OpenApiContact
        {
            Name = "Soporte Sistema Fichajes",
            Email = "soporte@sistemafichajes.com",
        }
    });
    
    // Configurar seguridad JWT en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header usando el esquema Bearer.<br><br>
                       Ingresa: 'Bearer' [espacio] y luego tu token.<br>
                       Ejemplo: 'Bearer eyJhbGciOiJIUzI1NiIs...'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
    
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));


// Registrar TokenService
builder.Services.AddScoped<ITokenService, TokenService>();

// Registrar TimeSummaryService
builder.Services.AddScoped<ITimeSummaryService, TimeSummaryService>();

// Configuracion para importar CSV 
builder.Services.AddScoped<IEmployeeImportService, EmployeeImportService>();

// Registrar AuditService
builder.Services.AddScoped<IAuditService, AuditService>();

// Registrar AuthorizationService (lógica centralizada de autorización)
builder.Services.AddScoped<IEmployeeAuthorizationService, EmployeeAuthorizationService>();

// Servicios de Vacaciones (desde Application)
builder.Services.AddScoped<IVacationBalanceService, VacationBalanceService>();
builder.Services.AddScoped<IVacationRequestService, VacationRequestService>();

// Configuracion JWT
var jwtConfig = builder.Configuration.GetSection(JwtOptions.SectionName);
var key    = jwtConfig["Key"]      ?? throw new Exception("JWT Key no configurada");
var issuer = jwtConfig["Issuer"]   ?? "SistemaFichajes";
var audience = jwtConfig["Audience"] ?? "SistemaFichajesClient";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        ClockSkew = TimeSpan.Zero // Sin margen de tiempo
    };
});

builder.Services.AddAuthorization();

// Configuracion de Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10; // Permitir 10 intentos
        limiterOptions.Window = TimeSpan.FromMinutes(1); // Por minuto
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0; // No hacer cola, rechazar inmediatamente
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Configuracion CORS — orígenes definidos en appsettings.json
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Aqui se construye la app
var app = builder.Build();

// Middleware

// ✅ MIDDLEWARE GLOBAL DE EXCEPCIONES - Debe ser lo primero
app.UseMiddleware<SistemaFichajesVacaciones.Api.Middleware.GlobalExceptionMiddleware>();

// Añadir CorrelationId a todos los logs de cada petición (debe ir antes del request logging)
app.UseMiddleware<SistemaFichajesVacaciones.Api.Middleware.CorrelationIdMiddleware>();

// Registrar cada petición HTTP en los logs (método, ruta, status code, duración)
app.UseSerilogRequestLogging();

if  (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fichajes API v1");
        c.RoutePrefix = "swagger";
        c.DisplayRequestDuration();
        c.EnablePersistAuthorization();
        c.DefaultModelsExpandDepth(-1);
    });
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Iniciar Seeder invocation (solo en desarrollo) 
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SistemaFichajesVacaciones.Infrastructure.Data.SeedData
            .EnsureSeedDataAsync(db);
    }
}

app.Run();
