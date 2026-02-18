using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CsvOk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ImportRuns",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "ImportRuns");
        }
    }
}
