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
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<User> Users => Set<User>();
    public DbSet<EmployeesStaging> EmployeesStaging => Set<EmployeesStaging>();
    public DbSet<ImportRun> ImportRuns => Set<ImportRun>();
    public DbSet<ImportError> ImportErrors => Set<ImportError>();

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

        // Configuración básica de User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.Property(u => u.PasswordHash).IsRequired();
        });

        // Configuración para EmployeesStaging
        modelBuilder.Entity<EmployeesStaging>(entity =>
        {
            entity.HasKey(e => e.StagingId);
            entity.Property(e => e.EmployeeCode).HasMaxLength(50);
            entity.Property(e => e.FullName).HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(255);
        });

        modelBuilder.Entity<ImportRun>(entity =>
        {
            entity.HasKey(e => e.ImportRunId);
            entity.Property(e => e.FileName).HasMaxLength(255);
        });

        modelBuilder.Entity<ImportError>(entity =>
        {
            entity.HasKey(e => e.ErrorId);
            entity.Property(e => e.ErrorMessage).HasMaxLength(500);
            entity.HasOne(e => e.ImportRun)
                  .WithMany(r => r.Errors)
                  .HasForeignKey(e => e.ImportRunId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

}
