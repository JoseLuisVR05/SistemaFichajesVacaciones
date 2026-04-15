using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class VacationPoliciesConfiguration : IEntityTypeConfiguration<VacationPolicies>
{
    public void Configure(EntityTypeBuilder<VacationPolicies> entity)
    {
        entity.HasKey(e => e.PolicyId);

        entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
        entity.Property(e => e.AccrualType).IsRequired().HasMaxLength(50);
        entity.Property(e => e.TotalDaysPerYear).HasColumnType("decimal(5,2)");
        entity.Property(e => e.CarryOverMaxDays).HasColumnType("decimal(5,2)");

        entity.HasIndex(e => new { e.Year, e.Name }).IsUnique();
    }
}
