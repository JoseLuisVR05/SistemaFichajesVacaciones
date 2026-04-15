using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class CalendarDaysConfiguration : IEntityTypeConfiguration<Calendar_Days>
{
    public void Configure(EntityTypeBuilder<Calendar_Days> entity)
    {
        entity.HasKey(e => new { e.CalendarTemplateId, e.Date });

        entity.Property(e => e.Date).HasColumnType("date");
        entity.Property(e => e.HolidayName).HasMaxLength(200);

        entity.HasOne(e => e.CalendarTemplate)
            .WithMany(c => c.CalendarDays)
            .HasForeignKey(e => e.CalendarTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.Date);
    }
}
