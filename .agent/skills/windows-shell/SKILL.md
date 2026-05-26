---
name: windows-shell-patterns
description: Windows git-bash gotchas for avoiding repeated failures on this machine
---

# Windows Shell Patterns

Applies whenever running Bash commands on this machine (Windows + git-bash).

## Hard rules

- **`PowerShell` tool = banned.** Bash tool only.
- **`rtk` prefix on every command.** `rtk git status`, `rtk bunx tsc --noEmit`, `rtk bun run test`.
- **`python3`/`python` not available.** Use `node -e` for scripting.
- **`/tmp` is unreliable** — maps to `C:\tmp` which may not exist. Never write temp files there.
- **`/dev/stdin` doesn't work** in git-bash on Windows.

## JSON parsing via Node stdin

```bash
some-command | node -e "
const c = [];
process.stdin.on('data', d => c.push(d));
process.stdin.on('end', () => {
  const d = JSON.parse(Buffer.concat(c).toString());
  // use d here
  console.log(d.someField);
});
"
```

Never do: `some-command > /tmp/x.json && node -e "require('/tmp/x.json')"` — `/tmp` doesn't exist.

## Temp files

Use `$USERPROFILE/AppData/Local/Temp/` if a temp file is truly needed:

```bash
TMPFILE="$USERPROFILE/AppData/Local/Temp/myfile-$$.json"
some-command > "$TMPFILE"
node -e "const d=require('$TMPFILE'); ..." 
rm "$TMPFILE"
```

## GitHub API

```bash
curl -s "https://api.github.com/repos/org/repo/releases/latest" | node -e "
const c = [];
process.stdin.on('data', d => c.push(d));
process.stdin.on('end', () => {
  const d = JSON.parse(Buffer.concat(c).toString());
  d.assets.forEach(a => console.log(a.name, a.browser_download_url));
});
"
```

## Graphify invocation

`graphify` binary may not be on PATH. Use:

```bash
PY="C:/Users/Hii/AppData/Roaming/uv/tools/graphifyy/Scripts/python.exe"
"$PY" -m graphify update .
```
