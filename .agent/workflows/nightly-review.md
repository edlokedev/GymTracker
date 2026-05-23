---
description: Nightly self-reflection — scan recent transcripts and propose improvements to CLAUDE.md, memory, skills, and permissions
schedule: "7 0 * * *"
---

# Nightly Self-Reflection Review

## Purpose

Automatically identifies friction, undocumented patterns, and improvement opportunities by reading recent session transcripts. Reports only — never auto-applies changes.

## How to run

- **Manually:** Ask Claude "run the nightly review" or "check recent sessions for improvements".
- **Re-schedule (after restart):** `/schedule` with the prompt below, or use CronCreate with `cron: "7 2 * * *"`.
- **Remote (persistent):** `/schedule` — creates a cloud-hosted cron that survives restarts.

## Prompt

Scan the 5 most recently modified JSONL transcript files under ~/.claude/projects/C--Users-Hii-Documents-Code-GymTracker/ (including subagent subdirs). For each, look at assistant tool_use blocks and user messages to identify:

1. **Friction points** — permission dialog triggers, repeated file searches, commands run multiple times before working, clarifying questions CLAUDE.md should have answered.
2. **Undocumented patterns** — code patterns used ≥2 times not in CLAUDE.md or .agent/skills/.
3. **New gotchas** — errors or wrong assumptions a rule could prevent next time.
4. **Skill/workflow gaps** — recurring multi-step sequences that could be a reusable .agent/workflow.
5. **Permission candidates** — read-only Bash commands that triggered prompts (candidates for permissions.allow in .claude/settings.json).

Also check memory files at ~/.claude/projects/C--Users-Hii-Documents-Code-GymTracker/memory/ — flag anything stale or missing.

Save the report to .agent/reviews/YYYY-MM-DD.md using this structure:

```markdown
# Nightly Review — YYYY-MM-DD

## Proposed CLAUDE.md Additions
- [ ] ...

## Memory Updates Needed
- [ ] ...

## New Skills / Workflows
- [ ] ...

## Permission Prompts to Reduce
- [ ] ...

## Notes
...
```

Do not edit CLAUDE.md, memory files, or settings.json — report only.

## Output location

`.agent/reviews/YYYY-MM-DD.md` — one file per day, created automatically.
