# Skill: .NET / C# Patterns

## Purpose
Enforce idiomatic C# and .NET coding patterns, project structure conventions, and framework-specific best practices for ASP.NET Core, .NET 6/7/8, and related Microsoft stack technologies.

## When to use
Active whenever the project backend language is C# or the framework is ASP.NET Core, .NET MAUI, Blazor, or any .NET-based service.

## Key patterns

### Project structure
- Use feature-based folder organisation: `Features/`, `Controllers/`, `Services/`, `Models/`, `Data/`
- Separate concerns: presentation layer, application layer (MediatR/CQRS), domain, infrastructure
- Use `appsettings.json` + `appsettings.{Environment}.json` for config; never hardcode
- Keep Program.cs minimal — register services in extension methods

### C# coding standards
- Use `record` types for immutable DTOs and value objects
- Prefer `var` for locally-inferred types; use explicit types for public API
- Use pattern matching, switch expressions, and null-coalescing operators
- Use `async`/`await` throughout — never `.Result` or `.Wait()` on async methods
- Avoid `static` state except for true constants
- Use `IOptions<T>` for strongly-typed configuration
- Dispose of `IDisposable` resources with `using` statements or DI lifetime management

### Dependency injection
- Register services via extension methods on `IServiceCollection`
- Prefer constructor injection; avoid service locator pattern
- Use `Scoped` for per-request services, `Singleton` for stateless services, `Transient` for lightweight objects
- Use `IHttpClientFactory` for all HTTP client instances

### ASP.NET Core specifics
- Use minimal APIs or controller-based routing consistently — don't mix
- Validate all inputs with `DataAnnotations` or FluentValidation
- Return `IActionResult` or typed `ActionResult<T>` from controllers
- Use `ProblemDetails` for error responses (RFC 7807)
- Implement global exception handling via middleware

### Entity Framework Core
- Use Code-First migrations — never modify the database manually
- Keep `DbContext` scoped to the request
- Use `AsNoTracking()` for read-only queries
- Avoid N+1 — use `.Include()` and `.ThenInclude()` explicitly
- Use `IRepository<T>` pattern to abstract EF from business logic

### Performance
- Use `IAsyncEnumerable<T>` for streaming large result sets
- Cache with `IMemoryCache` or `IDistributedCache` — document cache keys and TTLs
- Use `Span<T>` and `ArrayPool<T>` for high-throughput buffer operations
- Profile with dotnet-trace before optimising
