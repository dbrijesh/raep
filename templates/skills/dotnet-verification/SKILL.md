# Skill: .NET / C# Verification

## Purpose
Define the verification checklist for C# and .NET features before they are considered complete and ready for review or deployment.

## When to use
Run as part of the verify-work step on any .NET backend change.

## Verification checklist

### Code quality
- [ ] No compiler warnings — treat warnings as errors in CI (`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`)
- [ ] No `#pragma warning disable` without an accompanying explanation comment
- [ ] `dotnet format` run and output is clean
- [ ] No `TODO` or `FIXME` comments in the changed files without a linked issue

### Tests
- [ ] All existing unit and integration tests pass: `dotnet test`
- [ ] New functionality has corresponding unit tests (≥80% coverage on changed files)
- [ ] New API endpoints have at least one integration test
- [ ] No test marked `[Skip]` without a linked issue

### Security
- [ ] `dotnet list package --vulnerable` shows no critical/high vulnerabilities
- [ ] No secrets committed (secret-scanner hook confirms clean)
- [ ] All new endpoints have `[Authorize]` or deliberate `[AllowAnonymous]` with comment
- [ ] EF queries use parameterised form (no raw string interpolation into SQL)

### Performance
- [ ] No new synchronous blocking calls (`.Result`, `.Wait()`) on async code paths
- [ ] Database queries reviewed for N+1 — use `.Include()` where needed
- [ ] Caching strategy documented for any new read-heavy endpoint

### Configuration
- [ ] No hardcoded connection strings, API keys, or URLs
- [ ] New configuration values added to `appsettings.json` with a comment and to `appsettings.Development.json` with a safe default
- [ ] Secrets added to user-secrets or Key Vault reference — not to appsettings.json

### Build & deployment
- [ ] `dotnet build --configuration Release` succeeds with zero errors
- [ ] Docker build succeeds if the service is containerised
- [ ] EF Core migration generated if schema changed: `dotnet ef migrations add <Name>`
- [ ] Migration is reversible (`dotnet ef database update <PreviousMigration>` works)
