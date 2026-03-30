using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarHierarchyColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CityCode",
                table: "CalendarTemplates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "CalendarTemplates",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegionCode",
                table: "CalendarTemplates",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CityCode",
                table: "CalendarTemplates");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "CalendarTemplates");

            migrationBuilder.DropColumn(
                name: "RegionCode",
                table: "CalendarTemplates");
        }
    }
}
