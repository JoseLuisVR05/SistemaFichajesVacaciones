using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;


namespace SistemaFichajesVacaciones.Infrastructure.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

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

        if (!await context.VacationPolicies.AnyAsync())
        {
            var defaultPolicy = new VacationPolicies
            {
                Name = "Estándar España",
                Year = DateTime.UtcNow.Year,
                AccrualType = "ANNUAL",
                TotalDaysPerYear = 22,
                CarryOverMaxDays = 5,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.VacationPolicies.Add(defaultPolicy);
            await context.SaveChangesAsync();
        }

        await InitializeTerritoriesAndSchedules(context);
        await InitializeCalendarTemplates(context);
        await InitializeCalendarDaysData(context);


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
                StartDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Employees.Add(adminEmployee);
            await context.SaveChangesAsync();
        }

        // ▶ GARANTIZAR que el admin SIEMPRE tenga Employee_WorkSchedule (FUERA del if anterior)
        var adminHasSchedule = await context.Employee_WorkSchedules
            .AnyAsync(ews => ews.EmployeeId == adminEmployee.EmployeeId);

        if (!adminHasSchedule)
        {
            var territory = await context.Territories
                .FirstAsync(t => t.CountryCode == "ES");

            var scheduleTemplate = await context.WorkScheduleTemplates
                .FirstAsync(t => t.TerritoryId == territory.TerritoryId);

            var defaultSchedule = new Employee_WorkSchedule
            {
                EmployeeId = adminEmployee.EmployeeId,
                WorkScheduleTemplateId = scheduleTemplate.WorkScheduleTemplateId,
                ValidFrom = DateTime.UtcNow.Date,
                Notes = "Horario por defecto para administrador (plantilla España)",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
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
            }
        }
    }
    
    private static async Task InitializeCalendarDaysData(AppDbContext context)
    {
        var year = DateTime.UtcNow.Year;
        var existingCount = await context.Calendar_Days.CountAsync();

        if (existingCount > 0)
            return;

        var templates = await context.CalendarTemplates.ToListAsync();
        if (templates.Count == 0)
            return;

        var festivosList = new List<Calendar_Days>();

        var esTerritory = await context.Territories.FirstOrDefaultAsync(x => x.CountryCode == "ES");
        var inTerritory = await context.Territories.FirstOrDefaultAsync(x => x.CountryCode == "IN");

        if (esTerritory == null || inTerritory == null)
            return;

        var es_national = templates.FirstOrDefault(t => t.Level == "NATIONAL" && t.TerritoryId == esTerritory.TerritoryId);
        if (es_national != null)
        {
            festivosList.AddRange(new List<Calendar_Days>
            {
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 1, 1), IsWeekend = false, IsHoliday = true, HolidayName = "Año Nuevo" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 1, 6), IsWeekend = false, IsHoliday = true, HolidayName = "Reyes" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 4, 3), IsWeekend = false, IsHoliday = true, HolidayName = "Viernes Santo" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 5, 1), IsWeekend = false, IsHoliday = true, HolidayName = "Día del Trabajo" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 8, 15), IsWeekend = true, IsHoliday = true, HolidayName = "Asunción" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 10, 12), IsWeekend = false, IsHoliday = true, HolidayName = "Hispanidad" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 12, 8), IsWeekend = false, IsHoliday = true, HolidayName = "Inmaculada" },
                new() { CalendarTemplateId = es_national.CalendarTemplateId, Date = new DateTime(year, 12, 25), IsWeekend = false, IsHoliday = true, HolidayName = "Navidad" }
            });
        }

        var es_catalonia = templates.FirstOrDefault(t => t.Level == "REGIONAL" && t.RegionCode == "CAT" && t.TerritoryId == esTerritory.TerritoryId);
        if (es_catalonia != null)
        {
            festivosList.AddRange(new List<Calendar_Days>
            {
                new() { CalendarTemplateId = es_catalonia.CalendarTemplateId, Date = new DateTime(year, 4, 6), IsWeekend = false, IsHoliday = true, HolidayName = "Lunes de Pascua" },
                new() { CalendarTemplateId = es_catalonia.CalendarTemplateId, Date = new DateTime(year, 6, 24), IsWeekend = false, IsHoliday = true, HolidayName = "Sant Joan" },
                new() { CalendarTemplateId = es_catalonia.CalendarTemplateId, Date = new DateTime(year, 9, 11), IsWeekend = false, IsHoliday = true, HolidayName = "Diada Nacional de Catalunya" },
                new() { CalendarTemplateId = es_catalonia.CalendarTemplateId, Date = new DateTime(year, 12, 26), IsWeekend = true, IsHoliday = true, HolidayName = "Sant Esteve" }
            });
        }

        var es_barcelona = templates.FirstOrDefault(t => t.Level == "CITY" && t.CityCode == "BCN" && t.TerritoryId == esTerritory.TerritoryId);
        if (es_barcelona != null)
        {
            festivosList.AddRange(new List<Calendar_Days>
            {
                new() { CalendarTemplateId = es_barcelona.CalendarTemplateId, Date = new DateTime(year, 5, 25), IsWeekend = false, IsHoliday = true, HolidayName = "Pentecostés" },
                new() { CalendarTemplateId = es_barcelona.CalendarTemplateId, Date = new DateTime(year, 9, 24), IsWeekend = false, IsHoliday = true, HolidayName = "Mercè" }
            });
        }

        var in_national = templates.FirstOrDefault(t => t.Level == "NATIONAL" && t.TerritoryId == inTerritory.TerritoryId);
        if (in_national != null)
        {
            festivosList.AddRange(new List<Calendar_Days>
            {
                new() { CalendarTemplateId = in_national.CalendarTemplateId, Date = new DateTime(year, 1, 26), IsWeekend = false, IsHoliday = true, HolidayName = "Republic Day" },
                new() { CalendarTemplateId = in_national.CalendarTemplateId, Date = new DateTime(year, 8, 15), IsWeekend = true, IsHoliday = true, HolidayName = "Independence Day" },
                new() { CalendarTemplateId = in_national.CalendarTemplateId, Date = new DateTime(year, 10, 2), IsWeekend = false, IsHoliday = true, HolidayName = "Gandhi Jayanti" }
            });
        }

        var in_maharashtra = templates.FirstOrDefault(t => t.Level == "REGIONAL" && t.RegionCode == "MH" && t.TerritoryId == inTerritory.TerritoryId);
        if (in_maharashtra != null)
        {
            festivosList.AddRange(new List<Calendar_Days>
            {
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 3, 4), IsWeekend = false, IsHoliday = true, HolidayName = "Maha Shivaratri" },
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 3, 21), IsWeekend = true, IsHoliday = true, HolidayName = "Holi" },
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 4, 14), IsWeekend = false, IsHoliday = true, HolidayName = "Marathi New Year" },
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 10, 20), IsWeekend = false, IsHoliday = true, HolidayName = "Dussehra" },
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 11, 8), IsWeekend = true, IsHoliday = true, HolidayName = "Diwali" },
                new() { CalendarTemplateId = in_maharashtra.CalendarTemplateId, Date = new DateTime(year, 12, 25), IsWeekend = false, IsHoliday = true, HolidayName = "Christmas" }
            });
        }

        if (festivosList.Count > 0)
        {
            context.Calendar_Days.AddRange(festivosList);
            await context.SaveChangesAsync();
            Console.WriteLine($"SeedData: {festivosList.Count} festivos inicializados en Calendar_Days");
        }
    }

    private static async Task InitializeTerritoriesAndSchedules(AppDbContext context)
    {
        if (await context.Territories.AnyAsync())
            return;

        // ▶ ESPAÑA
        var territoryES = new Territory
        {
            CountryCode = "ES",
            CountryName = "España",
            Location = "España",
            UTC = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Territories.Add(territoryES);

        var territoryIN = new Territory
        {
            CountryCode = "IN",
            CountryName = "India",
            Location = "India",
            UTC = 5,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Territories.Add(territoryIN);
        await context.SaveChangesAsync();

        var templateES = new WorkScheduleTemplate
        {
            Name = "Horario Barcelona (Montcada i Reixac)",
            Description = "Lunes-Jueves 8:00-17:30 (60min), Viernes 8:00-14:00",
            TerritoryId = territoryES.TerritoryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.WorkScheduleTemplates.Add(templateES);

        var templateIN = new WorkScheduleTemplate
        {
            Name = "Horario Mumbai (Vidhyavihar & Andheri)",
            Description = "Lunes-Viernes 9:30-18:30 (60min), Sábado 10:00-14:00 (60min)",
            TerritoryId = territoryIN.TerritoryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.WorkScheduleTemplates.Add(templateIN);
        await context.SaveChangesAsync();

        var daysES = new List<WorkScheduleDayDetail>
        {
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 0, IsWorkDay = true, ExpectedStartTime = new TimeOnly(8, 0), ExpectedEndTime = new TimeOnly(17, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 1, IsWorkDay = true, ExpectedStartTime = new TimeOnly(8, 0), ExpectedEndTime = new TimeOnly(17, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 2, IsWorkDay = true, ExpectedStartTime = new TimeOnly(8, 0), ExpectedEndTime = new TimeOnly(17, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 3, IsWorkDay = true, ExpectedStartTime = new TimeOnly(8, 0), ExpectedEndTime = new TimeOnly(17, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 4, IsWorkDay = true, ExpectedStartTime = new TimeOnly(8, 0), ExpectedEndTime = new TimeOnly(14, 0), BreakMinutes = 0, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 5, IsWorkDay = false, ExpectedStartTime = null, ExpectedEndTime = null, BreakMinutes = 0, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateES.WorkScheduleTemplateId, DayOfWeek = 6, IsWorkDay = false, ExpectedStartTime = null, ExpectedEndTime = null, BreakMinutes = 0, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        context.WorkScheduleDayDetails.AddRange(daysES);

        var daysIN = new List<WorkScheduleDayDetail>
        {
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 0, IsWorkDay = true, ExpectedStartTime = new TimeOnly(9, 30), ExpectedEndTime = new TimeOnly(18, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 1, IsWorkDay = true, ExpectedStartTime = new TimeOnly(9, 30), ExpectedEndTime = new TimeOnly(18, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            // Wednesday: 9:30-18:30, 60min break
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 2, IsWorkDay = true, ExpectedStartTime = new TimeOnly(9, 30), ExpectedEndTime = new TimeOnly(18, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            // Thursday: 9:30-18:30, 60min break
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 3, IsWorkDay = true, ExpectedStartTime = new TimeOnly(9, 30), ExpectedEndTime = new TimeOnly(18, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            // Friday: 9:30-18:30, 60min break
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 4, IsWorkDay = true, ExpectedStartTime = new TimeOnly(9, 30), ExpectedEndTime = new TimeOnly(18, 30), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            // Saturday: 10:00-14:00, 60min break
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 5, IsWorkDay = true, ExpectedStartTime = new TimeOnly(10, 0), ExpectedEndTime = new TimeOnly(14, 0), BreakMinutes = 60, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            // Sunday: No laboral
            new() { WorkScheduleTemplateId = templateIN.WorkScheduleTemplateId, DayOfWeek = 6, IsWorkDay = false, ExpectedStartTime = null, ExpectedEndTime = null, BreakMinutes = 0, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        context.WorkScheduleDayDetails.AddRange(daysIN);
        await context.SaveChangesAsync();
    }

    private static async Task InitializeCalendarTemplates(AppDbContext context)
    {
        var year = DateTime.UtcNow.Year;

        if (await context.CalendarTemplates.AnyAsync(c => c.Year == year))
            return;

        var territoryES = await context.Territories.FirstAsync(t => t.CountryCode == "ES");
        var territoryIN = await context.Territories.FirstAsync(t => t.CountryCode == "IN");

        var calendarES_National = new CalendarTemplate
        {
            TerritoryId = territoryES.TerritoryId,
            Year = year,
            Level = "NATIONAL",
            RegionCode = null,
            CityCode = null,
            Name = $"Calendario Nacional España {year}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarES_National);

        var calendarES_Catalonia = new CalendarTemplate
        {
            TerritoryId = territoryES.TerritoryId,
            Year = year,
            Level = "REGIONAL",
            RegionCode = "CAT",
            CityCode = null,
            Name = $"Calendario Regional Cataluña {year}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarES_Catalonia);

        var calendarES_Barcelona = new CalendarTemplate
        {
            TerritoryId = territoryES.TerritoryId,
            Year = year,
            Level = "CITY",
            RegionCode = "CAT",
            CityCode = "BCN",
            Name = $"Calendario Local Barcelona {year}",
            IsActive = true,
            IsDefault = true,  // Default para empleados en Barcelona
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarES_Barcelona);
        await context.SaveChangesAsync();

        var calendarIN_National = new CalendarTemplate
        {
            TerritoryId = territoryIN.TerritoryId,
            Year = year,
            Level = "NATIONAL",
            RegionCode = null,
            CityCode = null,
            Name = $"Calendario Nacional India {year}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarIN_National);

        var calendarIN_Maharashtra = new CalendarTemplate
        {
            TerritoryId = territoryIN.TerritoryId,
            Year = year,
            Level = "REGIONAL",
            RegionCode = "MH",
            CityCode = null,
            Name = $"Calendario Estatal Maharashtra {year}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarIN_Maharashtra);

        var calendarIN_Mumbai = new CalendarTemplate
        {
            TerritoryId = territoryIN.TerritoryId,
            Year = year,
            Level = "CITY",
            RegionCode = "MH",
            CityCode = "MUM",
            Name = $"Calendario Local Mumbai {year}",
            IsActive = true,
            IsDefault = true,  // Default para empleados en Mumbai
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CalendarTemplates.Add(calendarIN_Mumbai);
        await context.SaveChangesAsync();
    }
}

