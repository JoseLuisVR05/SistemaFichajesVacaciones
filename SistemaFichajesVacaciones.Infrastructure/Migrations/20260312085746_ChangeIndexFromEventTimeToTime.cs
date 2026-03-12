using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChangeIndexFromEventTimeToTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_EmployeeId_Time",
                table: "TimeEntries",
                columns: new[] { "EmployeeId", "Time" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_EmployeeId_Time",
                table: "TimeEntries");

            
        }
    }
}
