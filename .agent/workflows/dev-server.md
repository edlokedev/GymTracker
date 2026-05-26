---
description: Start, wait for, and stop the Vite dev server on Windows
---

# Dev Server (Windows)

## Start (background task)

```bash
rtk bun run dev
```

Wait for ready:
```bash
until curl -sf http://localhost:3000 >/dev/null 2>&1; do sleep 2; done && echo "ready"
```

## Stop (Windows — reliable)

```bash
taskkill //F //IM node.exe 2>/dev/null; true
```

Do NOT use `kill $(lsof -ti:3000)` — unreliable on Windows git-bash. Do NOT use `pkill node` — not available. `taskkill //F //IM node.exe` kills all node processes; safe in dev context.

## Check if running

```bash
curl -sf http://localhost:3000 >/dev/null 2>&1 && echo "up" || echo "down"
```

## Notes

- Port is 3000 by default.
- Always stop before committing/pushing to avoid dangling processes.
- If `taskkill` fails with "process not found" — server wasn't running, safe to ignore.
