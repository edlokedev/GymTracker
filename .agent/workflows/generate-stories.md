---
description: Generate user stories from meeting transcripts or notes
---

# Generate User Stories

Analyze meeting transcripts and extract user stories following INVEST principles.

## Workflow

1. **Input**: Receive meeting transcript or notes from user
2. **Analyze**: Identify requirements and functionality discussed
3. **Generate**: Create user stories as markdown files
4. **Output**: Save to `docs/stories/`

## File Naming Convention

`[NN]-[kebab-case-goal].md`

Examples:
- `01-search-exercises-by-name.md`
- `02-track-workout-progress.md`

## Story Format

```markdown
# User Story: [Number] - [Brief Title]

**As a** [type of user],
**I want** [to perform an action],
**so that** [I gain a specific benefit].

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Notes (Optional)

- [Context or open questions from transcript]
```

## INVEST Principles

Stories must be:

| Principle | Meaning |
|-----------|---------|
| **I**ndependent | Self-contained, implementable alone |
| **N**egotiable | Room for discussion, not contracts |
| **V**aluable | Delivers tangible value to user |
| **E**stimable | Clear enough to estimate effort |
| **S**mall | Completable in one sprint |
| **T**estable | Has verifiable acceptance criteria |

## Vertical Slicing

✅ **DO**: Create end-to-end functionality slices
> "As a user, I want to log a workout so I can track my progress."

❌ **DON'T**: Split by technical layer
> "Create the workout database table" — This is a task, not a story

## Example

**Transcript snippet:**
> "Users need to find exercises quickly. Searching by muscle group is essential. They should see the exercise with images and difficulty level..."

**Generated stories:**
1. Search exercises by muscle group
2. Display exercise details with images
3. Filter exercises by difficulty level
