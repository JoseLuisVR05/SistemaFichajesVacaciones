using SistemaFichajesVacaciones.Domain.Configuration;
using SistemaFichajesVacaciones.Domain.Constants;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;


namespace SistemaFichajesVacaciones.Infrastructure.Services;

public interface ITokenService
{
    string GenerateToken(int userId, string email, List<string>? roles = null);
}

public class TokenService : ITokenService
{
    private readonly JwtOptions _jwt;
    public TokenService(IOptions<JwtOptions> jwtOptions) => _jwt = jwtOptions.Value;

    public string GenerateToken(int userId, string email, List<string>? roles = null)
    {
        var key = Encoding.UTF8.GetBytes(_jwt.Key);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimNames.UserId, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (roles != null && roles.Any())
        {
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            claims.Add(new Claim("role", roles.First()));
        }

        var creds = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}