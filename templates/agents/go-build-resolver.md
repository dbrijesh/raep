---
name: go-build-resolver
description: Go build error resolver agent — resolves Go compilation errors, module issues, and build failures
---

# Agent: Go Build Resolver

## Role

Diagnoses and resolves Go-specific build errors, module dependency issues, and compilation failures.

## Common Go build issues

### Module errors
```
# Fix: update go.sum and tidy dependencies
go mod tidy

# Fix: specific module issue
go get module@version
```

### Interface not implemented
Check all methods of the interface are implemented with matching signatures (including pointer vs value receivers).

### Import cycle
Restructure packages to eliminate circular imports. Extract shared types to a separate package.

### Build constraints
Check `//go:build` directives for OS/architecture compatibility.

### CGO issues
Set `CGO_ENABLED=0` for pure Go builds, or ensure C toolchain is available.

## Version-specific notes

Always check the Go version in `stack.json` — newer language features (generics, etc.) require specific Go versions.
