---
description: Analyze codebase and propose updates to agent rules
---

# Update Agent Rules

Self-analyze the codebase to identify patterns and propose updates to agent guidelines.

## When to Use

Invoke this workflow when:
- Significant new patterns have been established
- Tech stack or conventions have changed
- Recurring gotchas should be documented
- New skills or workflows are needed

## Workflow

### 1. Analyze Codebase

Scan for:
- **New patterns** in `src/components/` and `src/routes/`
- **Repeated utilities** in stylesheets
- **Common hooks** or helper functions
- **Error handling patterns**
- **Testing conventions**

### 2. Compare with Current Rules

Review existing:
- `.gemini/agents.md` (core guidelines)
- `.agent/skills/` (specialized knowledge)
- `.agent/workflows/` (reusable processes)

### 3. Identify Gaps

Look for:
- Patterns used ≥3 times not documented
- Gotchas encountered during implementation
- New conventions not reflected in rules
- Outdated guidance that no longer applies

### 4. Propose Updates

Create a proposal with:

```markdown
## Proposed Rule Updates

### Changes to agents.md
- [ ] Add: [New pattern/convention]
- [ ] Update: [Outdated guidance]
- [ ] Remove: [No longer applicable]

### New Skills Needed
- [ ] [Skill name] — [Purpose]

### New Workflows Needed
- [ ] [Workflow name] — [Purpose]

### Rationale
[Explain why these changes improve agent effectiveness]
```

### 5. Request Approval

Present proposal to user via `notify_user` before making changes.

## Output Locations

| Update Type | Location |
|-------------|----------|
| Core project rules | `.gemini/agents.md` |
| Specialized knowledge | `.agent/skills/[name]/SKILL.md` |
| Reusable processes | `.agent/workflows/[name].md` |

## Example Triggers

- "I notice we're using a new state management pattern across 5 components"
- "The team has adopted a new testing convention"
- "There are recurring TypeScript patterns that should be documented"

## Safety

- **Never auto-apply changes** — always request user approval
- Keep changes focused and incremental
- Explain rationale clearly
- Preserve existing rules unless explicitly replacing
