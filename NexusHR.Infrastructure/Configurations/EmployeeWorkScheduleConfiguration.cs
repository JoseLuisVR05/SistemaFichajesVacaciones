using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class EmployeeWorkScheduleConfiguration : IEntityTypeConfiguration<Employee_WorkSchedule>
{
    public void Configure(EntityTypeBuilder<Employee_WorkSchedule> entity)
    {
        entity.HasKey(e => e.WorkScheduleId);

        entity.HasIndex(e => new { e.EmployeeId, e.ValidFrom });

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.WorkScheduleTemplate)
            .WithMany()
            .HasForeignKey(e => e.WorkScheduleTemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.WorkScheduleTemplateId);
    }
}
