---
name: gsd:set-profile
description: Switch model profile for Get Things Done agents (quality/balanced/budget/inherit)
argument-hint: <profile (quality|balanced|budget|inherit)>
model: haiku
allowed-tools:
  - Bash
---

Show the following output to the user verbatim, with no extra commentary:

!`node "$HOME/.claude/get-things-done/bin/gsd-tools.cjs" config-set-model-profile $ARGUMENTS --raw`
