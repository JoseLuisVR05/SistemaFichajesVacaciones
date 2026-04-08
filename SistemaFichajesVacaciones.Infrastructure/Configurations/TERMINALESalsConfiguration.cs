using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class TERMINALESalsConfiguration : IEntityTypeConfiguration<TERMINALESals>
{
    public void Configure(EntityTypeBuilder<TERMINALESals> entity)
    {
        entity.ToTable("TERMINALESals");

        entity.HasKey(e => e.Codigo);

        entity.Property(e => e.Codigo).IsRequired().HasMaxLength(2);
        entity.Property(e => e.IP).HasMaxLength(30);
        entity.Property(e => e.Puerto).HasMaxLength(5);
        entity.Property(e => e.Descripcion).HasMaxLength(30);
        entity.Property(e => e.NumeroSerie).HasMaxLength(20);

        entity.HasOne(e => e.Territory)
            .WithMany()
            .HasForeignKey(e => e.TerritoryId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TerritoryId);
    }
}
