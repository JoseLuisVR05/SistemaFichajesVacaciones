using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class VacationRequestDaysConfiguration : IEntityTypeConfiguration<VacationRequest_Days>
{
    public void Configure(EntityTypeBuilder<VacationRequest_Days> entity)
    {
        entity.HasKey(e => e.RequestDayId);

        entity.Property(e => e.Date).HasColumnType("date");
        entity.Property(e => e.DayFraction).HasColumnType("decimal(3,2)");

        entity.HasOne(e => e.Request)
            .WithMany(r => r.RequestDays)
            .HasForeignKey(e => e.RequestId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => new { e.RequestId, e.Date }).IsUnique();
    }
}
