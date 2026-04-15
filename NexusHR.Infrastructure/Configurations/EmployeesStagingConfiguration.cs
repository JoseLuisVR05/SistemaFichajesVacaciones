using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class EmployeesStagingConfiguration : IEntityTypeConfiguration<EmployeesStaging>
{
    public void Configure(EntityTypeBuilder<EmployeesStaging> entity)
    {
        entity.HasKey(e => e.StagingId);

        entity.Property(e => e.EmployeeCode).HasMaxLength(50);
        entity.Property(e => e.FullName).HasMaxLength(200);
        entity.Property(e => e.Email).HasMaxLength(255);
    }
}
