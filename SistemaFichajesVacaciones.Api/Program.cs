using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;


var builder = WebApplication.CreateBuilder(args);

// 🔹 AQUÍ se añaden los servicios
builder.Services.AddControllers()
.AddJsonOptions(options =>
    {
        // Esta opción ignora los ciclos y simplemente deja en 'null' la referencia repetida
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
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
    
    // Opcional: incluir comentarios XML
    // var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    // var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    // if (File.Exists(xmlPath))
    // {
    //     c.IncludeXmlComments(xmlPath);
    // }
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

//Configuracion JWT
var key = builder.Configuration["Jwt:Key"] ?? 
          builder.Configuration["Jwt:key"] ?? 
          throw new Exception("JWT Key no configurada");
          
var issuer = builder.Configuration["Jwt:Issuer"] ?? "SistemaFichajes";
var audience = builder.Configuration["Jwt:Audience"] ?? "SistemaFichajesClient";
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

//Congiguracion CORS para poder comsumir Api
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins("http://localhost:3000","http://localhost:5173") //  URLs de los frontends
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// 🔹 AQUÍ se construye la app
var app = builder.Build();

// 🔹 Middleware

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


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ----- START Seeder invocation (solo en Development) -----
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            await SistemaFichajesVacaciones.Infrastructure.Data.SeedData
                .EnsureSeedDataAsync(db);
            Console.WriteLine("✅ SeedData ejecutado correctamente.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during seeding: {ex.Message}");
            throw;
        }   
    }
}
// ----- END Seeder invocation -----
app.Run();
