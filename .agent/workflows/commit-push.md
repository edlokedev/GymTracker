---
description: Standard commit and push sequence with RTK prefix
---

# Commit and Push

Use when user says "commit", "commit and push", "push", or "save this".

## Steps

```bash
# 1. Check state
rtk git status --short --branch

# 2. Stage (prefer explicit files over -A)
rtk git add <files>

# 3. Commit
rtk git commit -m "$(cat <<'EOF'
type(scope): short description

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

# 4. Push (only if user said "push" or "commit and push")
rtk git push
```

## Commit message format

Follow existing repo style (`git log --oneline -5`). Common prefixes: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`.

## Notes

- Always use `rtk` prefix on every git command.
- Stage specific files — never `git add -A` or `git add .` blindly.
- Only push if explicitly asked.
- If pre-commit hook fails → fix issue, re-stage, NEW commit (never `--amend`).
