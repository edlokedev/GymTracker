---
name: gymmie-verification
description: Runs the Gymmie/GymTracker post-change verification workflow. Use when finishing code or config changes, before commit/push, or when user asks to verify, format, lint, test, or build this repo.
---

# Gymmie Verification

## Workflow

Run from repo root after code/config changes unless impossible:

1. `bun run format`
2. `bun run lint`
3. Focused tests for touched behavior, for example:
   - `bun run test src/features/workout-session/useWorkoutSession.test.tsx`
   - `bun run test src/features/workout-templates/model.test.ts`
4. `bun run build`
5. `graphify update .` when routes/API/DB/features changed or >=5 source files changed.

## Reporting

Final handoff must include verification status:

- `passed`: command completed successfully.
- `failed`: command ran and failed; include failing command and concise reason.
- `skipped`: command could not run; include blocker.

Mention known benign build warnings separately from failures.

## Git Hygiene

After formatting, check `git status --short` before staging. Do not stage `.agent/reviews/*`, dev logs, generated scratch files, or unrelated user changes unless explicitly requested.
