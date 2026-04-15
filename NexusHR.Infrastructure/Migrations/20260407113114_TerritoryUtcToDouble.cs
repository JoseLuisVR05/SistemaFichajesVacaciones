using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TerritoryUtcToDouble : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "BreakMinutes",
                table: "WorkScheduleDayDetails",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 60);

            migrationBuilder.AlterColumn<double>(
                name: "UTC",
                table: "Territories",
                type: "float",
                nullable: false,
                defaultValue: 1.0,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "BreakMinutes",
                table: "WorkScheduleDayDetails",
                type: "int",
                nullable: false,
                defaultValue: 60,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "UTC",
                table: "Territories",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(double),
                oldType: "float",
                oldDefaultValue: 1.0);
        }
    }
}
