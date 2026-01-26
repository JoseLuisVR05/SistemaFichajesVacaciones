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


        // Crear empleado admin si no existe
        var adminEmployeeCode = "ADMIN001";
        var adminEmployee = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeCode == adminEmployeeCode);
        
        if (adminEmployee == null)
        {
            adminEmployee = new Employee
            {
                EmployeeCode = adminEmployeeCode,
                FullName = "Administrador Sistema",
                Email = "admin@local.dev",
                Company = "Sistema Fichajes",
                BusinessUnit = "IT",
                Department = "Administración",
                IsActive = true,
                StartDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
        };
            context.Employees.Add(adminEmployee);
            await context.SaveChangesAsync();
        }

        // Crear usuario admin si no existe
        var adminEmail = "admin@local.dev";
        var adminUser = await context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == adminEmail);
        
        if(adminUser == null)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
            adminUser = new Users
            {
                Email = adminEmail,
                PasswordHash = hash,
                EmployeeId = adminEmployee.EmployeeId,
                IsEnabled = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();

            // Asignar rol ADMIN al usuario creado
            var adminRole = await context.Roles.FirstAsync(r => r.Name == "ADMIN");
            var userRoleAdmin = new UserRoles
            {
                UserId = adminUser.UserId,
                RoleId = adminRole.RoleId
            };
            context.UserRoles.Add(userRoleAdmin);
            
            // Asignar rol EMPLOYEE al usuario creado para poder fichar
            var employeeRole = await context.Roles.FirstAsync(r => r.Name == "EMPLOYEE");
            var userRoleEmployee = new UserRoles
            {
                UserId = adminUser.UserId,
                RoleId = employeeRole.RoleId
            };
            context.UserRoles.Add(userRoleEmployee);

            await context.SaveChangesAsync();
            Console.WriteLine("Usuario administrador creado con roles admin y employee.");
        }
        else
        {
            //Actualizar EmployeeId del usuario admin si es nulo
            if(adminUser.EmployeeId == null)
            {
                adminUser.EmployeeId = adminEmployee.EmployeeId;
                context.Users.Update(adminUser);
                await context.SaveChangesAsync();
            }
            // Verificar si el usuario admin tiene el rol EMPLOYEE
            var hasEmployeeRole = await context.UserRoles
                .Include(ur => ur.Role)
                .AnyAsync(ur => ur.UserId == adminUser.UserId && ur.Role.Name == "EMPLOYEE");
        
                        if (!hasEmployeeRole)
        {
            var employeeRole = await context.Roles.FirstAsync(r => r.Name == "EMPLOYEE");
            var userRoleEmployee = new UserRoles
            {
                UserId = adminUser.UserId,
                RoleId = employeeRole.RoleId
            };
            context.UserRoles.Add(userRoleEmployee);

            await context.SaveChangesAsync();
            Console.WriteLine("Rol EMPLOYEE asignado al usuario administrador.");
        }
        else
            {
                Console.WriteLine("✅ Usuario admin ya tiene rol EMPLOYEE");
            }
        }
    }
}
