using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class RolesConfiguration : IEntityTypeConfiguration<Roles>
{
    public void Configure(EntityTypeBuilder<Roles> entity)
    {
        entity.HasKey(r => r.RoleId);

        entity.Property(r => r.Name).IsRequired().HasMaxLength(50);
        entity.HasIndex(r => r.Name).IsUnique();
    }
}
