using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class TimeDailySummaryConfiguration : IEntityTypeConfiguration<TimeDailySummary>
{
    public void Configure(EntityTypeBuilder<TimeDailySummary> entity)
    {
        entity.HasKey(e => e.SummaryId);

        entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();

        entity.Property(e => e.BalanceMinutes).HasDefaultValue(0);

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
