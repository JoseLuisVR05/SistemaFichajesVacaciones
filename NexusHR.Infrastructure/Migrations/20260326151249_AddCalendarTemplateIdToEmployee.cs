using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarTemplateIdToEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CalendarTemplateId",
                table: "Employees",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_CalendarTemplateId",
                table: "Employees",
                column: "CalendarTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_CalendarTemplates_CalendarTemplateId",
                table: "Employees",
                column: "CalendarTemplateId",
                principalTable: "CalendarTemplates",
                principalColumn: "CalendarTemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_CalendarTemplates_CalendarTemplateId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_CalendarTemplateId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "CalendarTemplateId",
                table: "Employees");
        }
    }
}
