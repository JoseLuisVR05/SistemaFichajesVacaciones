using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemaFichajesVacaciones.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTERMINALESalsMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // La tabla TERMINALESals YA EXISTE en la BD
            // Solo agregamos la nueva columna TerritoryId y su FK
            
            migrationBuilder.AddColumn<int>(
                name: "TerritoryId",
                table: "TERMINALESals",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TERMINALESals_TerritoryId",
                table: "TERMINALESals",
                column: "TerritoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_TERMINALESals_Territories_TerritoryId",
                table: "TERMINALESals",
                column: "TerritoryId",
                principalTable: "Territories",
                principalColumn: "TerritoryId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TERMINALESals_Territories_TerritoryId",
                table: "TERMINALESals");

            migrationBuilder.DropIndex(
                name: "IX_TERMINALESals_TerritoryId",
                table: "TERMINALESals");

            migrationBuilder.DropColumn(
                name: "TerritoryId",
                table: "TERMINALESals");
        }
    }
}
