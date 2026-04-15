using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkScheduleTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkScheduleTemplates",
                columns: table => new
                {
                    WorkScheduleTemplateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TerritoryId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkScheduleTemplates", x => x.WorkScheduleTemplateId);
                    table.ForeignKey(
                        name: "FK_WorkScheduleTemplates_Territories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "Territories",
                        principalColumn: "TerritoryId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkScheduleDayDetails",
                columns: table => new
                {
                    WorkScheduleDayDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkScheduleTemplateId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    IsWorkDay = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    ExpectedStartTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    ExpectedEndTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    BreakMinutes = table.Column<int>(type: "int", nullable: false, defaultValue: 60),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkScheduleDayDetails", x => x.WorkScheduleDayDetailId);
                    table.ForeignKey(
                        name: "FK_WorkScheduleDayDetails_WorkScheduleTemplates_WorkScheduleTemplateId",
                        column: x => x.WorkScheduleTemplateId,
                        principalTable: "WorkScheduleTemplates",
                        principalColumn: "WorkScheduleTemplateId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkScheduleDayDetails_WorkScheduleTemplateId_DayOfWeek",
                table: "WorkScheduleDayDetails",
                columns: new[] { "WorkScheduleTemplateId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkScheduleTemplates_TerritoryId",
                table: "WorkScheduleTemplates",
                column: "TerritoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkScheduleDayDetails");

            migrationBuilder.DropTable(
                name: "WorkScheduleTemplates");
        }
    }
}
