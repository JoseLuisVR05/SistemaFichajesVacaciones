using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class CalendarTemplateConfiguration : IEntityTypeConfiguration<CalendarTemplate>
{
    public void Configure(EntityTypeBuilder<CalendarTemplate> entity)
    {
        entity.HasKey(e => e.CalendarTemplateId);

        entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
        entity.Property(e => e.Year).IsRequired();
        entity.Property(e => e.IsDefault).HasDefaultValue(false);
        entity.Property(e => e.IsActive).HasDefaultValue(true);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        entity.HasOne<Territory>()
            .WithMany()
            .HasForeignKey(e => e.TerritoryId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasMany(e => e.CalendarDays)
            .WithOne(d => d.CalendarTemplate)
            .HasForeignKey(d => d.CalendarTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.TerritoryId);
        entity.HasIndex(e => new { e.TerritoryId, e.Year });
    }
}
