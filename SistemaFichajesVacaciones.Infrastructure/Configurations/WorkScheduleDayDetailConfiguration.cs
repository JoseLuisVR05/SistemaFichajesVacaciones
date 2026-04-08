using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class WorkScheduleDayDetailConfiguration : IEntityTypeConfiguration<WorkScheduleDayDetail>
{
    public void Configure(EntityTypeBuilder<WorkScheduleDayDetail> entity)
    {
        entity.HasKey(e => e.WorkScheduleDayDetailId);

        entity.Property(e => e.DayOfWeek).IsRequired();
        entity.Property(e => e.IsWorkDay).HasDefaultValue(true);
        entity.Property(e => e.ExpectedStartTime).HasColumnType("time");
        entity.Property(e => e.ExpectedEndTime).HasColumnType("time");
        entity.Property(e => e.BreakMinutes);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        entity.HasIndex(e => new { e.WorkScheduleTemplateId, e.DayOfWeek }).IsUnique();
    }
}
