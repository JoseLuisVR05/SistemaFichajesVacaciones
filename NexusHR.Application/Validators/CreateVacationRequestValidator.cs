using FluentValidation;
using NexusHR.Application.DTOs.Vacations;

namespace NexusHR.Application.Validators;

public class CreateVacationRequestValidator : AbstractValidator<CreateVacationRequestDto>
{
    private static readonly string[] ValidTypes = ["VACATION", "PERSONAL", "OTHER"];

    public CreateVacationRequestValidator()
    {
        RuleFor(x => x.StartDate)
            .NotEmpty()
            .WithMessage("La fecha de inicio es obligatoria.");

        RuleFor(x => x.EndDate)
            .NotEmpty()
            .WithMessage("La fecha de fin es obligatoria.")
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("La fecha de fin debe ser igual o posterior a la fecha de inicio.");

        RuleFor(x => x.Type)
            .Must(t => t == null || ValidTypes.Contains(t))
            .WithMessage($"El tipo debe ser uno de: {string.Join(", ", ValidTypes)}.");
    }
}
