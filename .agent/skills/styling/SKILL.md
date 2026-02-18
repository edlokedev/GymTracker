---
name: Styling Guidelines
description: Tailwind v4 styling conventions, design tokens, and component patterns for the GymTracker fitness dashboard
---

# Styling & Tailwind (v4) Guidelines

Use these guidelines when adding UI, components, or modifying layout/theme.

## Core Principles

- Prefer Tailwind utilities directly in JSX for one-off styling
- Promote repeated patterns (≥3 occurrences) to `@layer components` in `src/styles.css`
- Keep class strings static (no template-literal branching) for tree-shaking
- Use additive variant classes (e.g. `.btn-danger`) instead of conditional logic
- Avoid overusing `@apply`; small explicit CSS blocks improve readability

## Mobile-First Design

All components must be designed mobile-first:

| Aspect | Pattern |
|--------|---------|
| Touch Targets | `min-h-[44px]` for interactive elements |
| Grid | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| Typography | `text-base sm:text-lg` |
| Spacing | `gap-3 sm:gap-4 lg:gap-6` and `p-4 sm:p-6` |
| Modals | `items-end sm:items-center` (bottom sheet on mobile) |
| Corners | `rounded-xl sm:rounded-lg` |
| Touch States | `active:scale-[0.98]`, `active:bg-*` |

## File Roles

- `src/styles.css` — Global import, base resets, design tokens, component layers
- `tailwind.config.ts` — Theme extensions (colors, fonts, shadows)
- `vite.config.ts` — Includes `@tailwindcss/vite` plugin

## Design Tokens

Define in `:root` for semantic naming:

```css
:root {
  /* Primary Brand */
  --color-brand: #3b82f6;
  --color-brand-accent: #10b981;
  --color-brand-muted: #6b7280;
  
  /* Dashboard Surfaces */
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-surface-elevated: #f1f5f9;
  
  /* Data Visualization */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  
  /* Text Hierarchy */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  
  /* Borders & Dividers */
  --color-border: #e2e8f0;
  --color-border-muted: #f1f5f9;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --gradient-surface: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-primary: #0f172a;
    --color-surface-secondary: #1e293b;
    --color-surface-elevated: #334155;
    --color-text-primary: #f8fafc;
    --color-text-secondary: #cbd5e1;
    --color-text-muted: #64748b;
    --color-border: #334155;
    --color-border-muted: #1e293b;
    --gradient-surface: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  }
}
```

## Component Classes

### Fitness Card
```css
.fitness-card {
  background: var(--gradient-surface);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}
.fitness-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
```

### Workout Stat
```css
.workout-stat {
  background: var(--color-surface-secondary);
  border: 1px solid var(--color-border-muted);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}
.workout-stat:hover {
  background: var(--color-surface-elevated);
  transform: translateY(-1px);
}
```

### Exercise Badge (with variants)
```css
.exercise-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Variants */
.exercise-badge-beginner { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.exercise-badge-intermediate { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
.exercise-badge-advanced { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
```

### Gradient Button
```css
.gradient-button {
  background: var(--gradient-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}
.gradient-button:hover {
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}
```

## Utility Classes

```css
@layer utilities {
  .focus-ring { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); }
  .glass-effect { backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.8); }
  .exercise-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
  .gradient-text { background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
}
```

## Extraction Workflow

1. **Prototype inline** with Tailwind utilities
2. **Confirm reuse** (≥3 times or conceptually shared)
3. **Extract** to `@layer components` with semantic name
4. **Remove duplication** from components

### Decision Checklist (all YES → extract)
- Stable design? (unlikely to churn)
- Semantically nameable? (`.exercise-card`, not `.blue-box`)
- Broadly reusable or variant-bearing?

## Class Ordering

Keep logical order: layout → spacing → display → sizing → typography → color → state/animation

```tsx
// Example
<div className="exercise-card flex flex-col gap-4 p-6 rounded-xl hover:shadow-lg">
```

## Avoid

- Dynamic utility concatenation (`"px-"+size`)
- Unscoped global selectors
- Inline hex colors when tokens exist
- Undocumented Tailwind plugin changes
