using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class TimeCorrectionConfiguration : IEntityTypeConfiguration<TimeCorrection>
{
    public void Configure(EntityTypeBuilder<TimeCorrection> entity)
    {
        entity.HasKey(e => e.CorrectionId);

        entity.Property(e => e.Status).HasMaxLength(20);
        entity.HasIndex(e => new { e.EmployeeId, e.Status });

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.ApprovedByUser)
            .WithMany()
            .HasForeignKey(e => e.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
