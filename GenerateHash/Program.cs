using System;

// dotnet run --project .\GenerateHash -- "ContraseñaParaHashear" para generar contraseña
class Program
{
    static void Main(string[] args)
    {
        var pwd = args.Length > 0 ? args[0] : "Admin123!";
        var hash = BCrypt.Net.BCrypt.HashPassword(pwd);
        Console.WriteLine(hash);
    }
}