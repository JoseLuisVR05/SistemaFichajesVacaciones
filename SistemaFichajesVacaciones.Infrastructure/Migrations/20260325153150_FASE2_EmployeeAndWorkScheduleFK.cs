using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FASE2_EmployeeAndWorkScheduleFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BreakMinutes",
                table: "Employee_WorkSchedules");

            migrationBuilder.DropColumn(
                name: "ExpectedEndTime",
                table: "Employee_WorkSchedules");

            migrationBuilder.DropColumn(
                name: "ExpectedStartTime",
                table: "Employee_WorkSchedules");

            migrationBuilder.AddColumn<int>(
                name: "TerritoryId",
                table: "Employees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkScheduleTemplateId",
                table: "Employee_WorkSchedules",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_TerritoryId",
                table: "Employees",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Employee_WorkSchedules_WorkScheduleTemplateId",
                table: "Employee_WorkSchedules",
                column: "WorkScheduleTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employee_WorkSchedules_WorkScheduleTemplates_WorkScheduleTemplateId",
                table: "Employee_WorkSchedules",
                column: "WorkScheduleTemplateId",
                principalTable: "WorkScheduleTemplates",
                principalColumn: "WorkScheduleTemplateId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_Territories_TerritoryId",
                table: "Employees",
                column: "TerritoryId",
                principalTable: "Territories",
                principalColumn: "TerritoryId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employee_WorkSchedules_WorkScheduleTemplates_WorkScheduleTemplateId",
                table: "Employee_WorkSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_Employees_Territories_TerritoryId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_TerritoryId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employee_WorkSchedules_WorkScheduleTemplateId",
                table: "Employee_WorkSchedules");

            migrationBuilder.DropColumn(
                name: "TerritoryId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "WorkScheduleTemplateId",
                table: "Employee_WorkSchedules");

            migrationBuilder.AddColumn<int>(
                name: "BreakMinutes",
                table: "Employee_WorkSchedules",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "ExpectedEndTime",
                table: "Employee_WorkSchedules",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<TimeSpan>(
                name: "ExpectedStartTime",
                table: "Employee_WorkSchedules",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));
        }
    }
}
