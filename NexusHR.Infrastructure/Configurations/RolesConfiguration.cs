using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class RolesConfiguration : IEntityTypeConfiguration<Roles>
{
    public void Configure(EntityTypeBuilder<Roles> entity)
    {
        entity.HasKey(r => r.RoleId);

        entity.Property(r => r.Name).IsRequired().HasMaxLength(50);
        entity.HasIndex(r => r.Name).IsUnique();
    }
}
