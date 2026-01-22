using SistemaFichajesVacaciones.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

// 🔹 AQUÍ se añaden los servicios
builder.Services.AddControllers()
.AddJsonOptions(options =>
    {
        // Esta opción ignora los ciclos y simplemente deja en 'null' la referencia repetida
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));


// Registrar TokenService
builder.Services.AddScoped<ITokenService, TokenService>();

// Configuracion para importar CSV
builder.Services.AddScoped<IEmployeeImportService, EmployeeImportService>();

//Configuracion JWT
var key = builder.Configuration["Jwt:key"];
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key!))
    };
});

builder.Services.AddAuthorization();

// 🔹 AQUÍ se construye la app
var app = builder.Build();

// 🔹 Middleware

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fichajes API v1");
    c.RoutePrefix = "swagger"; // Accesible en /swagger
});

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// ----- START Seeder invocation (solo en Development) -----
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var env = services.GetRequiredService<IWebHostEnvironment>();
        if (env.IsDevelopment())
        {
            var db = services.GetRequiredService<AppDbContext>();
            await SistemaFichajesVacaciones.Infrastructure.Data.SeedData.EnsureSeedDataAsync(db);
            Console.WriteLine("SeedData ejecutado correctamente (Development).");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error during seeding: {ex}");
        throw;
    }
}
// ----- END Seeder invocation -----
app.Run();
