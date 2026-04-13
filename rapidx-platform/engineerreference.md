# RapidX Engineer Reference

Quick-reference for the two core development workflows: **Spec-Driven Development** (write the spec first, generate the plan, execute) and **Direct Plan-Execute-Review** (skip the spec, go straight to the work). Covers greenfield projects, brownfield features, and bug fixes.

---

## Execution Modes

Choose how much autonomy the agent has before you start any workflow.

| Mode | Command | Autonomy | Best For |
|------|---------|----------|----------|
| **Mode 1** | _(default chat)_ | Manual — you direct every step | Exploration, one-off edits |
| **Mode 2** | `/rapidx:do-mode2 <task>` | Low — agent proposes, you approve every gate | High-stakes changes, unfamiliar code, regulated environments |
| **Mode 3** | `/rapidx:do-mode3 <task>` | Medium — parallel subagents, you approve at wave boundaries | Medium-to-large features, parallelizable work |
| **Mode 4** | `/rapidx:do-mode4 <task>` | Full autopilot — plans, executes, commits | Well-understood tasks, trusted codebase with passing tests |

**Rule of thumb:** Use Mode 2 when you want to stay in the loop. Use Mode 4 when the task is clear and the test suite is green. Use Mode 3 for anything in between.

---

## Workflow A — Spec-Driven Development

Use when: building a feature of any meaningful size, greenfield work, or whenever you want an auditable trail from requirement → implementation.

```
Spec → Plan → Tasks → Execute → Review → Ship
```

### Step 1 — Write the spec

```
/rapidx:spec <feature name or description>
```

Creates `specs/###-feature-slug/spec.md` with:
- Problem statement
- User stories with Given/When/Then acceptance criteria
- Technical design (data model, API, components)
- Non-functional requirements
- Constitution check

Review and edit the spec before proceeding. Close open questions in section 6.

### Step 2 — Generate the implementation plan

```
/rapidx:plan-spec <###-feature-slug>
```

Creates `specs/###-feature-slug/plan.md` with:
- Phased task breakdown (Foundation → Core → Integration → Review)
- Per-task file targets and dependency map
- Version constraints from your tech stack
- Definition of Done

### Step 3 — Break into executable tasks

```
/rapidx:tasks-from-spec <###-feature-slug>
```

Populates `.planning/TASKS.md` and creates `specs/###-feature-slug/tasks.md` and `checklist.md`. Tasks are GTD-compatible and agent-assigned.

### Step 4 — Execute

Pick your mode:

```
/rapidx:execute-phase               # Mode 1 — manual step-by-step
/rapidx:do-mode2 execute <slug>     # Mode 2 — gated, you approve each task
/rapidx:do-mode3 execute <slug>     # Mode 3 — parallel waves
/rapidx:do-mode4 --from-spec <slug> # Mode 4 — full autopilot from spec
```

### Step 5 — Review

```
/rapidx:review                      # Code review against spec acceptance criteria
/rapidx:verify-work                 # Run tests, linter, coverage check
/rapidx:governance-check            # Security and compliance gates
```

### Step 6 — Ship

```
/rapidx:ship                        # Final checklist, PR creation, spec marked Implemented
```

---

## Workflow B — Direct Plan-Execute-Review

Use when: small features, bug fixes, refactors, chores — anything where a full spec is overkill.

```
Plan → Execute → Review
```

### Plan

```
/rapidx:plan-phase <description>
```

The agent reads your current project state (`.planning/STATE.md`, `.rapidx/stack.json`) and produces a concrete task list for the work described. Shorter than a spec plan — no user stories, no acceptance criteria template. Just tasks and files.

For a quick one-liner where you want the agent to just start:

```
/rapidx:do <description>            # Plan + execute in one step (Mode 1 equivalent)
```

### Execute

```
/rapidx:execute-phase               # Run next pending task from .planning/TASKS.md
```

Or use an execution mode directly:

```
/rapidx:do-mode2 <task>             # Step-by-step with gates
/rapidx:do-mode3 <task>             # Parallel subagents
/rapidx:do-mode4 <task>             # Autopilot
```

### Review

```
/rapidx:review                      # Code review
/rapidx:verify-work                 # Tests + linter
```

---

## Scenario Cheat Sheet

### Greenfield project (new codebase)

```
/rapidx:new-project                 # Initialize .planning/ structure and ROADMAP.md
/rapidx:spec <first feature>        # Spec the first deliverable
/rapidx:plan-spec <slug>
/rapidx:tasks-from-spec <slug>
/rapidx:do-mode3 execute <slug>     # Parallel execution for speed
```

### Brownfield — new feature on existing codebase

```
/rapidx:onboard-codebase            # First time on this repo: learn architecture + patterns
/rapidx:spec <feature>              # Write spec with existing architecture context
/rapidx:plan-spec <slug>
/rapidx:tasks-from-spec <slug>
/rapidx:do-mode2 execute <slug>     # Gated — you verify each change against existing code
```

### Brownfield — small enhancement or chore

```
/rapidx:plan-phase <what to change>
/rapidx:do-mode2 <task>             # or mode4 if it's genuinely low-risk
/rapidx:verify-work
```

### Bug fix

```
/rapidx:debug <symptom description>  # Agent investigates, produces root cause + fix plan
/rapidx:do-mode2 <fix description>   # Gated execution — bugs deserve oversight
/rapidx:verify-work
```

### Refactor

```
/rapidx:plan-phase refactor <scope>
/rapidx:do-mode3 <refactor task>    # Parallel is good for file-by-file refactors
/rapidx:verify-work
/rapidx:review
```

---

## Keeping Context Fresh

```
/rapidx:learn                       # Teach the agent about new patterns you just wrote
/rapidx:learn-arch                  # Update architecture knowledge after structural changes
/rapidx:knowledge-sync              # Full knowledge refresh (run at start of a new session)
/rapidx:progress                    # See current phase status and task completion
/rapidx:note <anything>             # Save a decision or context note to the session
```

---

## Quick Daily Loop

**Starting a session:**
```
/rapidx:knowledge-sync              # Reload project context
/rapidx:progress                    # See where you left off
```

**Doing work:**
```
/rapidx:execute-phase               # Continue next pending task
```

**Ending a session:**
```
/rapidx:verify-work                 # Confirm everything still passes
/rapidx:session-report              # Summary of what was done
```

---

## Mode Selection Quick Guide

```
Is this destructive, compliance-sensitive, or touching auth/payments?
  → Mode 2 (you approve every gate)

Is this a well-scoped feature with tests already covering the area?
  → Mode 4 (autopilot, check the audit log after)

Is this a medium feature with clear parallel work streams?
  → Mode 3 (parallel waves, you approve between waves)

Are you exploring or unsure what the right change is?
  → Mode 1 / direct chat — figure it out first, then pick a mode
```
