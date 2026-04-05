---
name: Qdotnet-core-expert
description: Use when building .NET 8 applications with minimal APIs, clean architecture, or cloud-native microservices. Invoke for Entity Framework Core, CQRS with MediatR, JWT authentication, AOT compilation.
license: MIT
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: backend
triggers: ".NET Core, .NET 8, ASP.NET Core, C# 12, minimal API, Entity Framework Core, microservices .NET, CQRS, MediatR"
role: specialist
scope: implementation
output-format: code
related-skills: fullstack-guardian, microservices-architect, cloud-architect, test-master
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# .NET Core Expert

## Core Workflow

1. **Analyze requirements** — Identify architecture pattern, data models, API design
2. **Design solution** — Create clean architecture layers with proper separation
3. **Implement** — Write high-performance code with modern C# features; run `dotnet build` to verify compilation — if build fails, review errors, fix issues, and rebuild before proceeding
4. **Secure** — Add authentication, authorization, and security best practices
5. **Test** — Write comprehensive tests with xUnit and integration testing; run `dotnet test` to confirm all tests pass — if tests fail, diagnose failures, fix the implementation, and re-run before continuing; verify endpoints with `curl` or a REST client

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Minimal APIs | `references/minimal-apis.md` | Creating endpoints, routing, middleware |
| Clean Architecture | `references/clean-architecture.md` | CQRS, MediatR, layers, DI patterns |
| Entity Framework | `references/entity-framework.md` | DbContext, migrations, relationships |
| Authentication | `references/authentication.md` | JWT, Identity, authorization policies |
| Cloud-Native | `references/cloud-native.md` | Docker, health checks, configuration |

## Constraints

### MUST DO
- Use .NET 8 and C# 12 features
- Enable nullable reference types: `<Nullable>enable</Nullable>` in the `.csproj`
- Use async/await for all I/O operations — e.g., `await dbContext.Users.ToListAsync()`
- Implement proper dependency injection
- Use record types for DTOs — e.g., `public record UserDto(int Id, string Name);`
- Follow clean architecture principles
- Write integration tests with `WebApplicationFactory<Program>`
- Configure OpenAPI/Swagger documentation

### MUST NOT DO
- Use synchronous I/O operations
- Expose entities directly in API responses
- Skip input validation
- Use legacy .NET Framework patterns
- Mix concerns across architectural layers
- Use deprecated EF Core patterns

## Code Patterns

### Basic: Minimal API Endpoint with XML Doc
```csharp
/// <summary>
/// Retrieves a user by ID.
/// </summary>
/// <param name="id">The user identifier.</param>
/// <param name="sender">MediatR mediator.</param>
/// <param name="ct">Cancellation token.</param>
/// <returns>UserDto if found; NotFound otherwise.</returns>
app.MapGet("/users/{id}", async (int id, ISender sender, CancellationToken ct) =>
{
    var result = await sender.Send(new GetUserQuery(id), ct);
    return result is null ? Results.NotFound() : Results.Ok(result);
})
.WithName("GetUser")
.Produces<UserDto>(200)
.ProducesProblem(404);
```

### Error Handling: ProblemDetails + Result Pattern
```csharp
public sealed record Result<T>(bool Success, T? Value, string? Error)
{
    public static Result<T> Ok(T value) => new(true, value, null);
    public static Result<T> Fail(string error) => new(false, default, error);
}

public sealed class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result<UserDto>>
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateUserCommand> _validator;

    public async Task<Result<UserDto>> Handle(CreateUserCommand req, CancellationToken ct)
    {
        var validation = await _validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return Result<UserDto>.Fail(string.Join("; ", validation.Errors));
        
        var user = new User { Name = req.Name, Email = req.Email };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return Result<UserDto>.Ok(new UserDto(user.Id, user.Name));
    }
}
```

### Advanced: MediatR + FluentValidation
```csharp
public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().Length(2, 100);
        RuleFor(x => x.Email).EmailAddress().NotEmpty();
    }
}

app.MapPost("/users", async (CreateUserRequest req, ISender sender, CancellationToken ct) =>
{
    var result = await sender.Send(new CreateUserCommand(req.Name, req.Email), ct);
    return result.Success 
        ? Results.Created($"/users/{result.Value?.Id}", result.Value)
        : Results.BadRequest(new ProblemDetails { Detail = result.Error });
})
.Produces<UserDto>(201)
.ProducesProblem(400);
```

## Comment Template

Use XML documentation (///) for all public members:
```csharp
/// <summary>
/// Brief description.
/// </summary>
/// <param name="paramName">Parameter description.</param>
/// <returns>Return value description.</returns>
/// <exception cref="ExceptionType">When this exception is thrown.</exception>
public async Task<UserDto> GetUserAsync(int id)
```

## Lint Rules

- **dotnet format**: Run `dotnet format` before commits; enforce with CI
- **Build warnings**: Use `dotnet build -warnaserror` to fail on warnings
- **StyleCop**: Add `<PropertyGroup><GenerateDocumentationFile>true</GenerateDocumentationFile></PropertyGroup>` to .csproj
- **Roslynator**: Install via NuGet; configure `.editorconfig` for rule sets
- **Pragma sparingly**: Never use `#pragma warning disable` without justification

## Security Checklist

1. **SQL Injection**: Use parameterized EF Core queries; never string interpolation in LINQ
2. **XSS**: Razor auto-encodes by default; trust HTML only from trusted sources
3. **CSRF**: Include `[ValidateAntiForgeryToken]` on POST/PUT/DELETE; use `asp-antiforgery="true"` in forms
4. **Authentication/Authorization**: Use `[Authorize]` attributes; enforce JWT validation in middleware
5. **HTTPS Enforcement**: Set `app.UseHsts()` and `app.UseHttpsRedirection()`
6. **Secrets**: Never commit connection strings; use User Secrets in dev, Azure Key Vault in production

## Anti-patterns (Wrong → Correct)

| Wrong | Correct |
|-------|---------|
| `async void DoWork()` | `async Task DoWork()` |
| `var handler = serviceProvider.GetService(...)` | Inject dependencies via constructor |
| `catch (Exception ex)` | Catch specific exceptions; log and re-throw |
| `StreamReader sr = File.OpenText(path)` | `using var sr = File.OpenText(path)` |
| `Task.Result; Task.Wait()` | Always `await` async operations |
