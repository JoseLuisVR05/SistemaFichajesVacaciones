using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;


namespace SistemaFichajesVacaciones.Infrastructure.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(AppDbContext context)
    {
        // Aplica migraciones pendientes
        await context.Database.MigrateAsync();

        // Crear usuario admin de desarrollo si no existe (contraseña por defecto: Admin123!)
        var adminEmail = "admin@local.dev";
        if (!await context.Users.AnyAsync(u => u.Email == adminEmail))
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
            var admin = new Users
            {
                Email = adminEmail,
                PasswordHash = hash,
                IsEnabled = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}