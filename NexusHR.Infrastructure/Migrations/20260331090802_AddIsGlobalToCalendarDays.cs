using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsGlobalToCalendarDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGlobal",
                table: "Calendar_Days",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsGlobal",
                table: "Calendar_Days");
        }
    }
}
