using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;


namespace SistemaFichajesVacaciones.Infrastructure.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(AppDbContext context)
    {
        // Aplica migraciones pendientes
        await context.Database.MigrateAsync();

         // ===== 1. ROLES =====
        if (!await context.Roles.AnyAsync())
        {
            var roles = new List<Roles>
            {
                new() { Name = "ADMIN", Description = "Administrador del sistema" },
                new() { Name = "RRHH", Description = "Recursos Humanos" },
                new() { Name = "MANAGER", Description = "Responsable de equipo" },
                new() { Name = "EMPLOYEE", Description = "Empleado básico" }
            };
            context.Roles.AddRange(roles);
            await context.SaveChangesAsync();
        }


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
            // Asignar rol ADMIN al usuario creado
            var adminRole = await context.Roles.FirstAsync(r => r.Name == "ADMIN");
            context.UserRoles.Add(new UserRoles
            {
                UserId = admin.UserId,
                RoleId = adminRole.RoleId
            });
            await context.SaveChangesAsync();
            
            await context.SaveChangesAsync();
        }
    }
}