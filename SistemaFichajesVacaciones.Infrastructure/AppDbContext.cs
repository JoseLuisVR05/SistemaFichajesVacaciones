using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Users> Users => Set<Users>();
    public DbSet<Roles> Roles => Set<Roles>();
    public DbSet<UserRoles> UserRoles => Set<UserRoles>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<TimeDailySummary> TimeDailySummaries => Set<TimeDailySummary>();
    public DbSet<EmployeesStaging> EmployeesStaging => Set<EmployeesStaging>();
    public DbSet<ImportRun> ImportRuns => Set<ImportRun>();
    public DbSet<ImportError> ImportErrors => Set<ImportError>();
    public DbSet<AuditLog> AuditLog => Set<AuditLog>();
    public DbSet<TimeCorrection> TimeCorrections => Set<TimeCorrection>();
    public DbSet<Calendar_Days> Calendar_Days => Set<Calendar_Days>();
    public DbSet<CalendarTemplate> CalendarTemplates => Set<CalendarTemplate>();
    public DbSet<Employee_WorkSchedule> Employee_WorkSchedules => Set<Employee_WorkSchedule>();
    public DbSet<Territory> Territories => Set<Territory>();
    public DbSet<WorkScheduleTemplate> WorkScheduleTemplates => Set<WorkScheduleTemplate>();
    public DbSet<WorkScheduleDayDetail> WorkScheduleDayDetails => Set<WorkScheduleDayDetail>();
    public DbSet<TERMINALESals> TERMINALESals => Set<TERMINALESals>();
    // Vacaciones
    public DbSet<VacationPolicies> VacationPolicies => Set<VacationPolicies>();
    public DbSet<Employee_VacationBalance> EmployeeVacationBalances => Set<Employee_VacationBalance>();
    public DbSet<VacationRequests> VacationRequests => Set<VacationRequests>();
    public DbSet<VacationRequest_Days> VacationRequestDays => Set<VacationRequest_Days>();
    public DbSet<AbsenceCalendar> AbsenceCalendar => Set<AbsenceCalendar>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
