using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class TimeEntryConfiguration : IEntityTypeConfiguration<TimeEntry>
{
    public void Configure(EntityTypeBuilder<TimeEntry> entity)
    {
        entity.HasKey(e => e.TimeEntryId);

        entity.Property(e => e.EntryType).IsRequired().HasMaxLength(20);
        entity.Property(e => e.Source).IsRequired().HasMaxLength(50);
        entity.Property(e => e.Time).HasColumnType("datetime").IsRequired(false);

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => new { e.EmployeeId, e.Time });
    }
}
