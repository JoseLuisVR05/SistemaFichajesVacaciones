using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVacationManagementSystem3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VacationPolicies",
                columns: table => new
                {
                    PolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    AccrualType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TotalDaysPerYear = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CarryOverMaxDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacationPolicies", x => x.PolicyId);
                });

            migrationBuilder.CreateTable(
                name: "VacationRequests",
                columns: table => new
                {
                    RequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "date", nullable: false),
                    EndDate = table.Column<DateTime>(type: "date", nullable: false),
                    RequestedDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ApproverEmployeeId = table.Column<int>(type: "int", nullable: true),
                    ApproverComment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecisionAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacationRequests", x => x.RequestId);
                    table.ForeignKey(
                        name: "FK_VacationRequests_Employees_ApproverEmployeeId",
                        column: x => x.ApproverEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VacationRequests_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeVacationBalances",
                columns: table => new
                {
                    BalanceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    PolicyId = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    AllocatedDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    UsedDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    RemainingDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeVacationBalances", x => x.BalanceId);
                    table.ForeignKey(
                        name: "FK_EmployeeVacationBalances_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EmployeeVacationBalances_VacationPolicies_PolicyId",
                        column: x => x.PolicyId,
                        principalTable: "VacationPolicies",
                        principalColumn: "PolicyId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AbsenceCalendar",
                columns: table => new
                {
                    AbsenceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "date", nullable: false),
                    AbsenceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceRequestId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbsenceCalendar", x => x.AbsenceId);
                    table.ForeignKey(
                        name: "FK_AbsenceCalendar_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AbsenceCalendar_VacationRequests_SourceRequestId",
                        column: x => x.SourceRequestId,
                        principalTable: "VacationRequests",
                        principalColumn: "RequestId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VacationRequestDays",
                columns: table => new
                {
                    RequestDayId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RequestId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "date", nullable: false),
                    DayFraction = table.Column<decimal>(type: "decimal(3,2)", nullable: false),
                    IsHolidayOrWeekend = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacationRequestDays", x => x.RequestDayId);
                    table.ForeignKey(
                        name: "FK_VacationRequestDays_VacationRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "VacationRequests",
                        principalColumn: "RequestId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceCalendar_Date",
                table: "AbsenceCalendar",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceCalendar_EmployeeId_Date",
                table: "AbsenceCalendar",
                columns: new[] { "EmployeeId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceCalendar_SourceRequestId",
                table: "AbsenceCalendar",
                column: "SourceRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeVacationBalances_EmployeeId_Year",
                table: "EmployeeVacationBalances",
                columns: new[] { "EmployeeId", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeVacationBalances_PolicyId",
                table: "EmployeeVacationBalances",
                column: "PolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_VacationPolicies_Year_Name",
                table: "VacationPolicies",
                columns: new[] { "Year", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequestDays_RequestId_Date",
                table: "VacationRequestDays",
                columns: new[] { "RequestId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_ApproverEmployeeId",
                table: "VacationRequests",
                column: "ApproverEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_EmployeeId_StartDate_EndDate",
                table: "VacationRequests",
                columns: new[] { "EmployeeId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_Status",
                table: "VacationRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbsenceCalendar");

            migrationBuilder.DropTable(
                name: "EmployeeVacationBalances");

            migrationBuilder.DropTable(
                name: "VacationRequestDays");

            migrationBuilder.DropTable(
                name: "VacationPolicies");

            migrationBuilder.DropTable(
                name: "VacationRequests");
        }
    }
}
