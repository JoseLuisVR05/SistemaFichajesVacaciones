using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeCalendarTemplateIdRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Droppear FK si existe
            migrationBuilder.Sql(@"
                IF OBJECT_ID('FK_Calendar_Days_CalendarTemplates_CalendarTemplateId', 'F') IS NOT NULL
                    ALTER TABLE Calendar_Days DROP CONSTRAINT FK_Calendar_Days_CalendarTemplates_CalendarTemplateId
            ");

            // Droppear PK si existe
            migrationBuilder.Sql(@"
                IF OBJECT_ID('PK_Calendar_Days', 'PK') IS NOT NULL
                    ALTER TABLE Calendar_Days DROP CONSTRAINT PK_Calendar_Days
            ");

            // Droppear índices si existen
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Calendar_Days_CalendarTemplateId_Date' AND object_id = OBJECT_ID('Calendar_Days'))
                    DROP INDEX IX_Calendar_Days_CalendarTemplateId_Date ON Calendar_Days
            ");

            migrationBuilder.AlterColumn<int>(
                name: "CalendarTemplateId",
                table: "Calendar_Days",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Calendar_Days",
                table: "Calendar_Days",
                columns: new[] { "CalendarTemplateId", "Date" });

            migrationBuilder.AddForeignKey(
                name: "FK_Calendar_Days_CalendarTemplates_CalendarTemplateId",
                table: "Calendar_Days",
                column: "CalendarTemplateId",
                principalTable: "CalendarTemplates",
                principalColumn: "CalendarTemplateId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Calendar_Days_CalendarTemplates_CalendarTemplateId",
                table: "Calendar_Days");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Calendar_Days",
                table: "Calendar_Days");

            migrationBuilder.AlterColumn<int>(
                name: "CalendarTemplateId",
                table: "Calendar_Days",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Calendar_Days",
                table: "Calendar_Days",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Calendar_Days_CalendarTemplateId_Date",
                table: "Calendar_Days",
                columns: new[] { "CalendarTemplateId", "Date" },
                unique: true,
                filter: "[CalendarTemplateId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Calendar_Days_CalendarTemplates_CalendarTemplateId",
                table: "Calendar_Days",
                column: "CalendarTemplateId",
                principalTable: "CalendarTemplates",
                principalColumn: "CalendarTemplateId",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
