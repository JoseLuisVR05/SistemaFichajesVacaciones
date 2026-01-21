using Microsoft.EntityFrameworkCore;
using SistemaFichajesVacaciones.Domain.Entities;

namespace SistemaFichajesVacaciones.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
}
