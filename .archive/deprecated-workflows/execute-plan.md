---
description: Execute an implementation plan step by step
---

# Execute Implementation Plan

Execute a specified task or sub-task from an implementation plan.

## Pre-Execution Validation

Before starting, validate:
1. Task/sub-task is clearly defined
2. Required dependencies are identified
3. Acceptance criteria are clear
4. Technical requirements understood

**If ANY are unclear, ask questions first!**

## Status Tracking

Use these markers in task files:
- `[ ]` Not Started
- `[/]` In Progress
- `[x]` Completed
- `[!]` Blocked

## Execution Steps

1. **Component Development**
   - Create/modify required components
   - Implement specified functionality
   - Add error handling
   - Update status to `[/]`

2. **Testing**
   - Write unit tests if applicable
   - Verify against acceptance criteria
   - Update status to `[x]` if passing

3. **Completion Checklist**
   - All specified requirements implemented
   - Tests passing
   - Error handling in place
   - Documentation updated
   - Status updated in task tracking

## Status Update Format

After implementation, provide:
```
Task: [Task Name]
Status: [x] Completed / [!] Blocked

Completed:
- [List completed items]

Pending:
- [List pending items if any]

Blockers:
- [List blockers if any]

Next Steps:
- [List next steps or dependencies]
```
