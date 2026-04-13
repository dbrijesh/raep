# Skill: .NET / C# Security

## Purpose
Enforce security best practices specific to ASP.NET Core and .NET applications, including authentication, authorisation, data protection, and secure-by-default configuration.

## When to use
Active whenever the backend is C# / .NET. Works alongside the universal `security-review` skill.

## Key patterns

### Authentication & authorisation
- Use ASP.NET Core Identity or an external OIDC provider (Entra ID, Auth0, Okta) — never roll your own auth
- Protect all endpoints with `[Authorize]` by default; explicitly mark public routes with `[AllowAnonymous]`
- Use policy-based authorisation (`AddAuthorization(options => options.AddPolicy(...))`) over role strings
- Use JWT Bearer tokens with short expiry + refresh token rotation
- Enable `RequireHttpsMetadata = true` in all non-development environments

### Data protection
- Use `IDataProtectionProvider` for encrypting cookies, tokens, and sensitive fields
- Never store plaintext passwords — use ASP.NET Core Identity's `PasswordHasher<T>`
- Encrypt PII at rest using `DataProtectionPurposeStrings`

### Input validation & injection prevention
- Validate all model inputs — use FluentValidation or DataAnnotations with `ModelState.IsValid`
- Use parameterised queries or EF Core — never string-concatenate SQL
- Sanitise HTML inputs with `HtmlEncoder` before rendering
- Use `[FromBody]`, `[FromQuery]` binding explicitly — never bind from multiple sources

### Secrets management
- Use `dotnet user-secrets` locally; Azure Key Vault or AWS Secrets Manager in production
- Never commit secrets to source control — enforce with secret-scanner hook
- Rotate secrets via Key Vault references — no hardcoded rotation logic

### HTTP security headers
- Add security headers via middleware: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`
- Disable server version disclosure: `server.AddServerHeader = false`
- Use CORS policy explicitly — never `AllowAnyOrigin` + `AllowCredentials`

### Dependency security
- Run `dotnet list package --vulnerable` in CI pipeline
- Pin NuGet package versions in production
- Use `dotnet-outdated` to flag unmaintained packages
