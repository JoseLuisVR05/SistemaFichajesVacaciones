using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class VacationRequestsConfiguration : IEntityTypeConfiguration<VacationRequests>
{
    public void Configure(EntityTypeBuilder<VacationRequests> entity)
    {
        entity.HasKey(e => e.RequestId);

        entity.Property(e => e.StartDate).HasColumnType("date");
        entity.Property(e => e.EndDate).HasColumnType("date");
        entity.Property(e => e.RequestedDays).HasColumnType("decimal(5,2)");
        entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
        entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
        entity.Property(e => e.ApproverComment).HasMaxLength(1000);

        entity.HasOne(e => e.Employee)
            .WithMany()
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.Approver)
            .WithMany()
            .HasForeignKey(e => e.ApproverEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.Status);
        entity.HasIndex(e => new { e.EmployeeId, e.StartDate, e.EndDate });
    }
}
