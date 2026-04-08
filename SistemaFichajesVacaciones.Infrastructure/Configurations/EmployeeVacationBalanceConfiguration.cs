using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class EmployeeVacationBalanceConfiguration : IEntityTypeConfiguration<Employee_VacationBalance>
{
    public void Configure(EntityTypeBuilder<Employee_VacationBalance> entity)
    {
        entity.HasKey(e => e.BalanceId);

        entity.Property(e => e.AllocatedDays).HasColumnType("decimal(5,2)");
        entity.Property(e => e.UsedDays).HasColumnType("decimal(5,2)");
        entity.Property(e => e.RemainingDays).HasColumnType("decimal(5,2)");

        entity.HasIndex(e => new { e.EmployeeId, e.Year }).IsUnique();

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Policy)
            .WithMany(p => p.VacationBalances)
            .HasForeignKey(e => e.PolicyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
