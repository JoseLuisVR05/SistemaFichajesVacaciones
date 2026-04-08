using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class WorkScheduleTemplateConfiguration : IEntityTypeConfiguration<WorkScheduleTemplate>
{
    public void Configure(EntityTypeBuilder<WorkScheduleTemplate> entity)
    {
        entity.HasKey(e => e.WorkScheduleTemplateId);

        entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
        entity.Property(e => e.Description).HasMaxLength(500);
        entity.Property(e => e.IsActive).HasDefaultValue(true);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        entity.HasOne<Territory>()
            .WithMany()
            .HasForeignKey(e => e.TerritoryId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasMany(e => e.DayDetails)
            .WithOne(d => d.WorkScheduleTemplate)
            .HasForeignKey(d => d.WorkScheduleTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.TerritoryId);
    }
}
