using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarTemplate_v2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location",
                table: "Calendar_Days");

            migrationBuilder.DropColumn(
                name: "Region",
                table: "Calendar_Days");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "Calendar_Days",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<int>(
                name: "CalendarTemplateId",
                table: "Calendar_Days",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CalendarTemplates",
                columns: table => new
                {
                    CalendarTemplateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TerritoryId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CalendarTemplates", x => x.CalendarTemplateId);
                    table.ForeignKey(
                        name: "FK_CalendarTemplates_Territories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "Territories",
                        principalColumn: "TerritoryId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Calendar_Days_CalendarTemplateId_Date",
                table: "Calendar_Days",
                columns: new[] { "CalendarTemplateId", "Date" },
                unique: true,
                filter: "[CalendarTemplateId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Calendar_Days_Date",
                table: "Calendar_Days",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_CalendarTemplates_TerritoryId",
                table: "CalendarTemplates",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_CalendarTemplates_TerritoryId_Year",
                table: "CalendarTemplates",
                columns: new[] { "TerritoryId", "Year" });

            migrationBuilder.AddForeignKey(
                name: "FK_Calendar_Days_CalendarTemplates_CalendarTemplateId",
                table: "Calendar_Days",
                column: "CalendarTemplateId",
                principalTable: "CalendarTemplates",
                principalColumn: "CalendarTemplateId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Calendar_Days_CalendarTemplates_CalendarTemplateId",
                table: "Calendar_Days");

            migrationBuilder.DropTable(
                name: "CalendarTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Calendar_Days_CalendarTemplateId_Date",
                table: "Calendar_Days");

            migrationBuilder.DropIndex(
                name: "IX_Calendar_Days_Date",
                table: "Calendar_Days");

            migrationBuilder.DropColumn(
                name: "CalendarTemplateId",
                table: "Calendar_Days");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "Calendar_Days",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "date");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Calendar_Days",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Region",
                table: "Calendar_Days",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
