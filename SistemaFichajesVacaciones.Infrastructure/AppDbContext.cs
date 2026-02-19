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
    public DbSet<Employee_WorkSchedule> Employee_WorkSchedules => Set<Employee_WorkSchedule>();

    // Vacaciones
    public DbSet<VacationPolicies> VacationPolicies => Set<VacationPolicies>();
    public DbSet<Employee_VacationBalance> EmployeeVacationBalances => Set<Employee_VacationBalance>();
    public DbSet<VacationRequests> VacationRequests => Set<VacationRequests>();
    public DbSet<VacationRequest_Days> VacationRequestDays => Set<VacationRequest_Days>();
    public DbSet<AbsenceCalendar> AbsenceCalendar => Set<AbsenceCalendar>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuración de Employee
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId);
            
            entity.Property(e => e.EmployeeCode)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.HasIndex(e => e.EmployeeCode)
                .IsUnique();
            
            entity.Property(e => e.FullName)
                .IsRequired()
                .HasMaxLength(200);
            
            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.HasIndex(e => e.Email)
                .IsUnique();

            // Relación jerárquica (empleado-manager)
            entity.HasOne(e => e.Manager)
                .WithMany(e => e.Subordinates)
                .HasForeignKey(e => e.ManagerEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

       // Configuración básica de Users
        modelBuilder.Entity<Users>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.Email)
                .IsUnique();

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.PasswordHash).IsRequired();
        });
        // Configuración básica de Roles
        modelBuilder.Entity<Roles>(entity =>
        {
            entity.HasKey(r => r.RoleId);
            entity.Property(r => r.Name)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasIndex(r => r.Name)
                .IsUnique();
        });

        // USERROLE
        modelBuilder.Entity<UserRoles>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuración de TimeEntry
        modelBuilder.Entity<TimeEntry>(entity =>
        {
            entity.HasKey(e => e.TimeEntryId);
            
            entity.Property(e => e.EntryType)
                .IsRequired()
                .HasMaxLength(20);
            
            entity.Property(e => e.Source)
                .IsRequired()
                .HasMaxLength(50);

            // Relación con Employee
            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Índice compuesto para búsquedas eficientes
            entity.HasIndex(e => new { e.EmployeeId, e.EventTime });
        });

        // Configuración para EmployeesStaging
        modelBuilder.Entity<EmployeesStaging>(entity =>
        {
            entity.HasKey(e => e.StagingId);
            entity.Property(e => e.EmployeeCode)
                .HasMaxLength(50);
            
            entity.Property(e => e.FullName)
                .HasMaxLength(200);
            
            entity.Property(e => e.Email)
                .HasMaxLength(255);
        });

        modelBuilder.Entity<ImportRun>(entity =>
        {
            entity.HasKey(e => e.ImportRunId);
            entity.Property(e => e.FileName).HasMaxLength(255);
        });

        modelBuilder.Entity<ImportError>(entity =>
        {
            entity.HasKey(e => e.ErrorId);
            entity.Property(e => e.ErrorMessage)
            .HasMaxLength(500);
            
            entity.HasOne(e => e.ImportRun)
                  .WithMany(r => r.Errors)
                  .HasForeignKey(e => e.ImportRunId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuración de TimeDailySummary
        modelBuilder.Entity<TimeDailySummary>(entity =>
        {
            entity.HasKey(e => e.SummaryId);
            entity.HasIndex(e => new { e.EmployeeId, e.Date })
            .IsUnique();

            // Esta columna es calculada por SQL Server
            // "stored: true" significa que el valor se guarda fisicamente, no se recalcula en cada lectura
            entity.Property(e => e.BalanceMinutes)
                .HasComputedColumnSql("[WorkedMinutes] - [ExpectedMinutes]", stored: true);
    
            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuración de TimeCorrection
        modelBuilder.Entity<TimeCorrection>(entity =>
        {
            entity.HasKey(e => e.CorrectionId);
            entity.Property(e => e.Status)
                .HasMaxLength(20);

            entity.HasIndex(e => new { e.EmployeeId, e.Status });

            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configuración de AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            
            entity.HasKey(e => e.AuditId); 
            entity.Property(e => e.Action)
                .IsRequired()
                .HasMaxLength(50);
        
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(100);

            //Relación con Users (PerformedByUser)
            entity.HasOne(e => e.PerformedByUser)
                .WithMany() // O .WithMany(u => u.AuditLogs) si agrego la lista en Users
                .HasForeignKey(e => e.PerformedByUserId)
                .OnDelete(DeleteBehavior.Restrict); 
        });

        // Configuración de Calendar_Days
        modelBuilder.Entity<Calendar_Days>(entity =>
        {
            entity.HasKey(e => e.Date);
            entity.Property(e => e.HolidayName)
                .HasMaxLength(200);
        });

        // Configuración de Employee_WorkSchedule
        modelBuilder.Entity<Employee_WorkSchedule>(entity =>
        {
            entity.HasKey(e => e.WorkScheduleId);
            entity.HasIndex(e => new { e.EmployeeId, e.ValidFrom});

            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // VACACIONES

        // Configuración de VacationPolicy
        modelBuilder.Entity<VacationPolicies>(entity =>
        {
            entity.HasKey(e => e.PolicyId);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(200);
            
            entity.Property(e => e.AccrualType)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.Property(e => e.TotalDaysPerYear)
                .HasColumnType("decimal(5,2)");
            
            entity.Property(e => e.CarryOverMaxDays)
                .HasColumnType("decimal(5,2)");
            
            entity.HasIndex(e => new { e.Year, e.Name }).IsUnique();
        });

        // Configuración de Employee_VacationBalance
        modelBuilder.Entity<Employee_VacationBalance>(entity =>
        {
            entity.HasKey(e => e.BalanceId);
            
            entity.Property(e => e.AllocatedDays)
                .HasColumnType("decimal(5,2)");
            
            entity.Property(e => e.UsedDays)
                .HasColumnType("decimal(5,2)");
            
            entity.Property(e => e.RemainingDays)
                .HasColumnType("decimal(5,2)");
            
            entity.HasIndex(e => new { e.EmployeeId, e.Year }).IsUnique();
            
            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Policy)
                .WithMany(p => p.VacationBalances)
                .HasForeignKey(e => e.PolicyId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configuración de VacationRequest
        modelBuilder.Entity<VacationRequests>(entity =>
        {
            entity.HasKey(e => e.RequestId);
            
            entity.Property(e => e.StartDate)
                .HasColumnType("date");
            
            entity.Property(e => e.EndDate)
                .HasColumnType("date");
            
            entity.Property(e => e.RequestedDays)
                .HasColumnType("decimal(5,2)");
            
            entity.Property(e => e.Type)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.Property(e => e.ApproverComment)
                .HasMaxLength(1000);
            
            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Approver)
                .WithMany()
                .HasForeignKey(e => e.ApproverEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.EmployeeId, e.StartDate, e.EndDate });
        });

        // Configuración de VacationRequest_Day
        modelBuilder.Entity<VacationRequest_Days>(entity =>
        {
            entity.HasKey(e => e.RequestDayId);
            
            entity.Property(e => e.Date)
                .HasColumnType("date");
            
            entity.Property(e => e.DayFraction)
                .HasColumnType("decimal(3,2)");
            
            entity.HasOne(e => e.Request)
                .WithMany(r => r.RequestDays)
                .HasForeignKey(e => e.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.RequestId, e.Date }).IsUnique();
        });

        // Configuración de AbsenceCalendar
        modelBuilder.Entity<AbsenceCalendar>(entity =>
        {
            entity.HasKey(e => e.AbsenceId);
            
            entity.Property(e => e.Date)
                .HasColumnType("date");
            
            entity.Property(e => e.AbsenceType)
                .IsRequired()
                .HasMaxLength(50);
            
            entity.HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.SourceRequest)
                .WithMany(r => r.AbsenceEntries)
                .HasForeignKey(e => e.SourceRequestId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
            entity.HasIndex(e => e.Date);
        });

    }           
}
    
