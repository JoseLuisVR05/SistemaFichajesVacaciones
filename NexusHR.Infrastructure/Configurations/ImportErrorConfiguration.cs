using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NexusHR.Domain.Entities;

namespace NexusHR.Infrastructure.Configurations;

public class ImportErrorConfiguration : IEntityTypeConfiguration<ImportError>
{
    public void Configure(EntityTypeBuilder<ImportError> entity)
    {
        entity.HasKey(e => e.ErrorId);

        entity.Property(e => e.ErrorMessage).HasMaxLength(500);

        entity.HasOne(e => e.ImportRun)
            .WithMany(r => r.Errors)
            .HasForeignKey(e => e.ImportRunId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
