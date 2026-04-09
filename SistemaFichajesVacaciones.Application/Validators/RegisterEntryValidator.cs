using FluentValidation;
using SistemaFichajesVacaciones.Application.DTOs.TimeControl;

namespace SistemaFichajesVacaciones.Application.Validators;

public class RegisterEntryValidator : AbstractValidator<RegisterEntryDto>
{
    private static readonly string[] ValidEntryTypes = ["IN", "OUT"];

    public RegisterEntryValidator()
    {
        RuleFor(x => x.EntryType)
            .Must(t => t == null || ValidEntryTypes.Contains(t))
            .WithMessage($"El tipo de fichaje debe ser IN o OUT.");

        RuleFor(x => x.Comment)
            .MaximumLength(500)
            .WithMessage("El comentario no puede superar los 500 caracteres.");
    }
}
