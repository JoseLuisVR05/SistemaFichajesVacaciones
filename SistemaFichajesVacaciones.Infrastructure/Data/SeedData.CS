using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;


namespace SistemaFichajesVacaciones.Infrastructure.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(AppDbContext context)
    {
        // Aplica migraciones pendientes, asegura que la base de datos esté actualizada
        await context.Database.MigrateAsync();

         // Implementa roles si no hubiera en la base de datos
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
        // Implementa calendario si no hubiera en la base de datos
        await InitializeCalendarDays(context);


        // Crear empleado admin si no existe
        var adminEmployeeCode = "ADMIN001";

        var adminEmployee = await context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeCode == adminEmployeeCode);
        
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
                StartDate = DateTime.Now,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            context.Employees.Add(adminEmployee);
            await context.SaveChangesAsync();

            // Crear horario de trabajo por defecto para el empleado admin

            var defaultSchedule = new Employee_WorkSchedule
            {
                EmployeeId = adminEmployee.EmployeeId,
                ValidFrom = DateTime.Now.Date,
                ExpectedStartTime = new TimeSpan(9, 0, 0), //09:00 AM
                ExpectedEndTime = new TimeSpan(18, 0, 0), //18:00 PM
                BreakMinutes = 60, //1 hora de descanso
                Notes = "Horario por defecto para administrador",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
                
            };

            context.Employee_WorkSchedules.Add(defaultSchedule);
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
                CreatedAt = DateTime.Now
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
     private static async Task InitializeCalendarDays(AppDbContext context)
    {
        var today = DateTime.Now.Date;
        
        // Crear días para los próximos 6 meses (incluyendo el mes actual)
        var startDate = new DateTime(today.Year, today.Month, 1);
        
        var endDate = startDate.AddMonths(6).AddDays(-1); // 6 meses completos
        
        var existingDates = await context.Calendar_Days
            .Where(c => c.Date >= startDate && c.Date <= endDate)
            .Select(c => c.Date)
            .ToListAsync();

        var daysToAdd = new List<Calendar_Days>();
        
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (existingDates.Contains(date))
                continue;
            
            var isWeekend = date.DayOfWeek == DayOfWeek.Saturday || 
                           date.DayOfWeek == DayOfWeek.Sunday;
            
            daysToAdd.Add(new Calendar_Days
            {
                Date = date,
                IsWeekend = isWeekend,
                IsHoliday = false
            });
        }

        if (daysToAdd.Any())
        {
            await context.Calendar_Days.AddRangeAsync(daysToAdd);
            await context.SaveChangesAsync();
            Console.WriteLine($"✅ Calendario inicializado: {daysToAdd.Count} días creados");
        }
        else
        {
            Console.WriteLine("✅ Calendario ya está inicializado");
        }
    }
}

