using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class UsersConfiguration : IEntityTypeConfiguration<Users>
{
    public void Configure(EntityTypeBuilder<Users> entity)
    {
        entity.HasKey(u => u.UserId);

        entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
        entity.HasIndex(u => u.Email).IsUnique();

        entity.Property(u => u.PasswordHash).IsRequired();
    }
}
