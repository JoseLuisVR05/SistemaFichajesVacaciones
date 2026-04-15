using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class TerritoryConfiguration : IEntityTypeConfiguration<Territory>
{
    public void Configure(EntityTypeBuilder<Territory> entity)
    {
        entity.HasKey(e => e.TerritoryId);

        entity.Property(e => e.CountryCode).IsRequired().HasMaxLength(2);
        entity.Property(e => e.CountryName).IsRequired().HasMaxLength(100);
        entity.Property(e => e.Location).HasMaxLength(100);
        entity.Property(e => e.UTC).HasDefaultValue(1.0);
        entity.Property(e => e.IsActive).HasDefaultValue(true);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        entity.HasIndex(e => e.CountryCode);
        entity.HasIndex(e => new { e.CountryCode, e.Location });
    }
}
