---
description: Generate a detailed implementation plan for a feature
---

# Generate Implementation Plan

Create a comprehensive implementation plan for a feature or user story.

## Workflow

1. **Gather Requirements**
   - Get feature description from user
   - Clarify acceptance criteria
   - Identify dependencies

2. **Analyze Codebase**
   - Review existing patterns in `src/`
   - Identify affected components
   - Check for reusable code

3. **Create Plan Document**
   - Save to: `docs/implementation-plans/[feature-name].md`

## Plan Template

```markdown
# [Feature Name] - Implementation Plan

## Overview
Brief description of the feature and its value.

## Technical Requirements

### Component Structure
\`\`\`
src/routes/[feature-path]/
├── page.tsx
└── _components/
    ├── [Component1].tsx
    └── [Component2].tsx
\`\`\`

### Required Components
- [ ] Component1 — [Description]
- [ ] Component2 — [Description]

### State Management
- Local state needs
- Server function requirements

## Acceptance Criteria
1. [ ] [Criterion 1]
2. [ ] [Criterion 2]
3. [ ] [Criterion 3]

## Modified Files
- `src/routes/[path].tsx` — [Changes]
- `src/components/[name].tsx` — [Changes]

## Testing Plan
- [ ] Unit tests for [component]
- [ ] Integration test for [flow]

## Dependencies
- [Dependency 1]
- [Dependency 2]

## Notes
- Technical considerations
- Edge cases to handle
```

## After Creation

1. Request user review of the plan
2. Iterate based on feedback
3. Once approved, use `/execute-plan` to implement
