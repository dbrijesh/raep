# Model Profiles

Model profiles control which Claude model each RapidX agent uses. This allows balancing quality vs token spend, or inheriting the currently selected session model.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` | `adaptive` | `inherit` |
|-------|-----------|------------|----------|------------|-----------|
| rapidx-planner | opus | opus | sonnet | opus | inherit |
| rapidx-roadmapper | opus | sonnet | sonnet | sonnet | inherit |
| rapidx-executor | opus | sonnet | sonnet | sonnet | inherit |
| rapidx-phase-researcher | opus | sonnet | haiku | sonnet | inherit |
| rapidx-project-researcher | opus | sonnet | haiku | sonnet | inherit |
| rapidx-research-synthesizer | sonnet | sonnet | haiku | haiku | inherit |
| rapidx-debugger | opus | sonnet | sonnet | opus | inherit |
| rapidx-codebase-mapper | sonnet | haiku | haiku | haiku | inherit |
| rapidx-verifier | sonnet | sonnet | haiku | sonnet | inherit |
| rapidx-plan-checker | sonnet | sonnet | haiku | haiku | inherit |
| rapidx-integration-checker | sonnet | sonnet | haiku | haiku | inherit |
| rapidx-nyquist-auditor | sonnet | sonnet | haiku | haiku | inherit |

## Profile Philosophy

**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Use when: conserving quota, high-volume work, less critical phases

**adaptive** — Role-based cost optimization
- Opus for planning and debugging (where reasoning quality has highest impact)
- Sonnet for execution, research, and verification (follows explicit instructions)
- Haiku for mapping, checking, and auditing (high volume, structured output)
- Use when: optimizing cost without sacrificing plan quality, solo development on paid API tiers

**inherit** - Follow the current session model
- All agents resolve to `inherit`
- Best when you switch models interactively (for example OpenCode or Kilo `/model`)
- **Required when using non-Anthropic providers** (OpenRouter, local models, etc.) — otherwise RapidX may call Anthropic models directly, incurring unexpected costs
- Use when: you want RapidX to follow your currently selected runtime model

## Using Non-Claude Runtimes (Codex, OpenCode, Gemini CLI, Kilo)

When installed for a non-Claude runtime, the RapidX installer sets `resolve_model_ids: "omit"` in `~/.rapidx/defaults.json`. This returns an empty model parameter for all agents, so each agent uses the runtime's default model. No manual setup is needed.

To assign different models to different agents, add `model_overrides` with model IDs your runtime recognizes:

```json
{
  "resolve_model_ids": "omit",
  "model_overrides": {
    "rapidx-planner": "o3",
    "rapidx-executor": "o4-mini",
    "rapidx-debugger": "o3",
    "rapidx-codebase-mapper": "o4-mini"
  }
}
```

The same tiering logic applies: stronger models for planning and debugging, cheaper models for execution and mapping.

## Using Claude Code with Non-Anthropic Providers (OpenRouter, Local)

If you're using Claude Code with OpenRouter, a local model, or any non-Anthropic provider, set the `inherit` profile to prevent RapidX from calling Anthropic models for subagents:

```bash
# Via settings command
/rapidx:settings
# → Select "Inherit" for model profile

# Or manually in .planning/config.json
{
  "model_profile": "inherit"
}
```

Without `inherit`, RapidX's default `balanced` profile spawns specific Anthropic models (`opus`, `sonnet`, `haiku`) for each agent type, which can result in additional API costs through your non-Anthropic provider.

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Check model_overrides for agent-specific override
3. If no override, look up agent in profile table
4. Pass model parameter to Task call
```

## Per-Agent Overrides

Override specific agents without changing the entire profile:

```json
{
  "model_profile": "balanced",
  "model_overrides": {
    "rapidx-executor": "opus",
    "rapidx-planner": "haiku"
  }
}
```

Overrides take precedence over the profile. Valid values: `opus`, `sonnet`, `haiku`, `inherit`, or any fully-qualified model ID (e.g., `"o3"`, `"openai/o3"`, `"google/gemini-2.5-pro"`).

## Switching Profiles

Runtime: `/rapidx:set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Design Rationale

**Why Opus for rapidx-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for rapidx-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for verifiers in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the phase promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for rapidx-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.

**Why `inherit` instead of passing `opus` directly?**
Claude Code's `"opus"` alias maps to a specific model version. Organizations may block older opus versions while allowing newer ones. RapidX returns `"inherit"` for opus-tier agents, causing them to use whatever opus version the user has configured in their session. This avoids version conflicts and silent fallbacks to Sonnet.

**Why `inherit` profile?**
Some runtimes (including OpenCode) let users switch models at runtime (`/model`). The `inherit` profile keeps all RapidX subagents aligned to that live selection.
