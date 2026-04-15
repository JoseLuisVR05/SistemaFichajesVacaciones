using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class ImportRunConfiguration : IEntityTypeConfiguration<ImportRun>
{
    public void Configure(EntityTypeBuilder<ImportRun> entity)
    {
        entity.HasKey(e => e.ImportRunId);
        entity.Property(e => e.FileName).HasMaxLength(255);
    }
}
