using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure.Configurations;

public class AbsenceCalendarConfiguration : IEntityTypeConfiguration<AbsenceCalendar>
{
    public void Configure(EntityTypeBuilder<AbsenceCalendar> entity)
    {
        entity.HasKey(e => e.AbsenceId);

        entity.Property(e => e.Date).HasColumnType("date");
        entity.Property(e => e.AbsenceType).IsRequired().HasMaxLength(50);

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.SourceRequest)
            .WithMany(r => r.AbsenceEntries)
            .HasForeignKey(e => e.SourceRequestId)
            .OnDelete(DeleteBehavior.SetNull);

        entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
        entity.HasIndex(e => e.Date);
    }
}
