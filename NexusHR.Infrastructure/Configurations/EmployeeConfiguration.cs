using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> entity)
    {
        entity.HasKey(e => e.EmployeeId);

        entity.Property(e => e.EmployeeCode).IsRequired().HasMaxLength(50);
        entity.HasIndex(e => e.EmployeeCode).IsUnique();

        entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);

        entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
        entity.HasIndex(e => e.Email).IsUnique();

        entity.HasOne(e => e.Manager)
            .WithMany(e => e.Subordinates)
            .HasForeignKey(e => e.ManagerEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Territory)
            .WithMany()
            .HasForeignKey(e => e.TerritoryId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TerritoryId);
    }
}
