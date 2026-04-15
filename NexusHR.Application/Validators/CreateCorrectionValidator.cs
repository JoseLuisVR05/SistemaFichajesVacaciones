using FluentValidation;
using NexusHR.Application.DTOs.TimeControl;

namespace NexusHR.Application.Validators;

public class CreateCorrectionValidator : AbstractValidator<CreateCorrectionDto>
{
    public CreateCorrectionValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty()
            .WithMessage("La fecha es obligatoria.")
            .LessThanOrEqualTo(_ => DateTime.Today)
            .WithMessage("No se puede solicitar una corrección para una fecha futura.");

        RuleFor(x => x.CorrectedMinutes)
            .GreaterThan(0)
            .WithMessage("Los minutos corregidos deben ser mayores que 0.");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .WithMessage("El motivo de la corrección es obligatorio.")
            .MaximumLength(500)
            .WithMessage("El motivo no puede superar los 500 caracteres.");
    }
}
