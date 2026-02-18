---
applyTo:
  - "src/**/*.tsx"
  - "src/styles.css"
  - "tailwind.config.*"
  - "**/*.md"
  - "vite.config.ts"
label: "Styling & Tailwind Guidelines"
---

# Styling & Tailwind (v4) Guidelines

Purpose: Provide focused rules for generating or editing styles so main instructions stay concise. Use these when adding UI, components, or modifying layout/theme.

## Core Principles
- Prefer composition with Tailwind utilities directly in JSX for one-off styling.
- Promote repeated patterns (≥3 occurrences) to a semantic class under `@layer components` inside `src/styles.css`.
- Keep class strings static (no template-literal branching) to enable Tailwind tree-shaking.
- Use additive variant classes (e.g. `.btn-danger`) instead of embedding conditional logic in the base pattern.
- Avoid overusing `@apply`; small, explicit CSS blocks improve readability and avoid plugin edge cases.

## Mobile-First Design Principles
All components must be designed mobile-first with responsive scaling:
- **Touch Targets**: Minimum 44px (min-h-[44px]) for all interactive elements
- **Responsive Grid**: Start with `grid-cols-1` then scale up: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- **Typography**: Mobile-first text sizing: `text-base sm:text-lg` pattern
- **Spacing**: Tighter spacing on mobile: `gap-3 sm:gap-4 lg:gap-6` and `p-4 sm:p-6`
- **Modals**: Full-screen on mobile (`items-end sm:items-center`), bottom sheet pattern
- **Visual Design**: Rounded corners scale up: `rounded-xl sm:rounded-lg`
- **Interactions**: Include active states for touch: `active:scale-[0.98]`, `active:bg-*`
- **Responsive Breakpoints**: `sm:` (640px+), `lg:` (1024px+), `xl:` (1280px+)

## File Roles
- `src/styles.css`: Global import (`@import "tailwindcss";`), base resets, design tokens, component & utility layers.
- `tailwind.config.ts`: Theme extensions (`colors.brand`, fonts, `boxShadow.focus-ring`). Try to centralize design tokens here first.
- `vite.config.ts`: Includes `@tailwindcss/vite` plugin — do not remove or reorder below path alias plugin without need.

## Design Tokens (Modern Fitness Dashboard Theme)
Expose tokens as CSS variables in `:root` for a modern fitness dashboard aesthetic. Keep naming semantic:
```
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

/* Dark mode variants */
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
Adding more? Mirror structure inside `tailwind.config.ts` `theme.extend` and then reference via `var(--color-*)` in custom CSS.

## Component Class Pattern (Fitness Dashboard Components)
Example fitness dashboard card (replaces basic button example):
```
.fitness-card {
  background: var(--gradient-surface);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.fitness-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

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
  box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.1);
}

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

.progress-ring {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: conic-gradient(var(--color-brand) var(--progress, 0%), var(--color-border) var(--progress, 0%));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

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
Adding a variant:
```
.exercise-badge-beginner { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.exercise-badge-intermediate { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
.exercise-badge-advanced { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
```

## Utility Layer Examples (Fitness Dashboard-Specific)
```
@layer utilities {
  .focus-ring { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); }
  .glass-effect { backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.8); }
  .exercise-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
  .workout-container { aspect-ratio: 16 / 9; position: relative; }
  .animate-counter { animation: countUp 0.8s ease-out; }
  .gradient-text { background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .exercise-card-hover { transition: all 0.2s ease; }
  .exercise-card-hover:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
}

@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Keep utilities single-purpose but dashboard-focused.

## Creating a New Reusable Pattern (Fitness Dashboard Focus)
1. Prototype with inline utilities in a component (focus on workout tracking & exercise data).
2. Confirm repetition (or conceptual reuse) ≥3 times across fitness views.
3. Extract to `@layer components` with semantic fitness name.
4. Remove duplication and ensure no dynamic class generation remains.

## Example Workflow (Exercise Card Pattern)
1. Inline prototype: `<div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm hover:shadow-lg" />`
2. After reuse → styles.css:
```
@layer components { 
  .exercise-card { 
    background: var(--gradient-surface); 
    border: 1px solid var(--color-border); 
    border-radius: 0.75rem; 
    padding: 1.5rem; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .exercise-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}
```
3. Replace all inline occurrences with `className="exercise-card"` + per-instance layout utilities like `col-span-2`.

## Route & Component Integration (Fitness Dashboard Layout)
When adding UI via routes, follow fitness dashboard patterns:
```
import { createFileRoute } from '@tanstack/react-router'
import { ExerciseBrowser } from '../components/ExerciseBrowser'
import { WorkoutStats } from '../components/WorkoutStats'

export const Route = createFileRoute('/exercises')({
  component: () => (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Exercise Library</h1>
          <p className="text-gray-600">Discover and track your fitness exercises</p>
        </header>
        
        <WorkoutStats className="stats-grid" />
        
        <section className="grid lg:grid-cols-4 gap-6">
          <ExerciseBrowser className="lg:col-span-3" />
          <aside className="space-y-4">
            {/* Recent exercises, favorites, etc. */}
          </aside>
        </section>
      </div>
    </main>
  ),
})
```
Do not import styles per-component; rely on root-level `<HeadContent />` injection already set in `__root.tsx`.

## Avoid
- Dynamically composing partial utility fragments (e.g. `"px-"+size`)
- Unscoped global selectors beyond base necessities
- Creating new color hexes inline when a token exists
- Adding Tailwind plugin changes without documenting rationale

## When Unsure
Document the variation inline via a code comment and prefer simplest static approach. Provide a short note in PR describing token or pattern intent so future extraction decisions are easier.


## Per-Component Styling Strategy
Most styles should remain inline as Tailwind utility class lists within the component's JSX. Extract ONLY when one of these is true:
- The same visual pattern (same cluster of ≥5 utilities) appears ≥3 times OR is conceptually shared (e.g. all exercise cards) even if not yet repeated.
- You need to enforce consistent theming across multiple routes (semantic abstraction like `.fitness-card`, `.exercise-badge`).
- A pattern must be modified via variants (e.g. size, state colors) and duplication would risk divergence.

When NOT to extract:
- One-off layout wrappers (`div` with spacing & positioning).
- Minor text formatting unique to a single component.
- Experimental UI still in flux.

Decision Checklist (all YES → extract):
1. Stable design? (unlikely to churn soon)
2. Semantically nameable? (`.exercise-card`, not `.blue-box`)
3. Broadly reusable or variant-bearing?

Example (keep inline):
```tsx
<div className="flex flex-col gap-4 p-4"> ... </div>
```

Example (extract): Pattern reused in multiple fitness views:
```css
@layer components { 
  .workout-tile { 
    display: flex; 
    flex-direction: column; 
    gap: 0.75rem; 
    padding: 1.5rem; 
    background: var(--color-surface-secondary); 
    border: 1px solid var(--color-border); 
    border-radius: 0.75rem;
    transition: all 0.2s ease;
  } 
  .workout-tile:hover {
    background: var(--color-surface-elevated);
    transform: translateY(-2px);
  }
}
```
Then in JSX:
```tsx
<div className="workout-tile">
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">Sets Completed</span>
    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
  </div>
  <span className="text-2xl font-bold gradient-text">24</span>
  <div className="flex items-center gap-2 text-xs">
    <span className="exercise-badge exercise-badge-beginner">+15%</span>
    <span className="text-gray-500">vs last week</span>
  </div>
</div>
```

Variant extension example (exercise difficulty badges):
```css
@layer components {
  .difficulty-badge { 
    font-size: 0.75rem; 
    letter-spacing: 0.05em; 
    text-transform: uppercase; 
    padding: 0.375rem 0.75rem; 
    border-radius: 0.5rem; 
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .difficulty-badge-beginner { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
  .difficulty-badge-intermediate { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
  .difficulty-badge-advanced { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
}
```

Guidelines for Components Editing (`*.tsx`) - Fitness Dashboard Focus:
- Keep class order logical: layout → spacing → display → sizing → typography → color → state/animation.
- Prefer grouping conceptually for fitness elements (e.g. `exercise-card flex flex-col gap-4 p-6 rounded-xl hover:shadow-lg`).
- Use semantic component classes for repeated fitness patterns: `workout-tile`, `exercise-grid`, `stats-grid`.
- Avoid dynamic boolean concatenation; instead choose full alternative strings: `className={isCompleted ? 'difficulty-badge difficulty-badge-beginner' : 'difficulty-badge difficulty-badge-advanced'}`.
- For exercise visualization, prefer dedicated containers: `exercise-grid`, `workout-container`.
- Use gradients strategically for primary actions and key metrics.

If complex grid layouts or exercise positioning emerges repeatedly, document rationale inline with a comment before extraction.

## Fitness Dashboard-Specific Patterns to Prioritize:
- **Cards & Tiles**: Use `fitness-card`, `workout-tile` for consistent elevation and spacing
- **Exercise Display**: Implement `exercise-badge` variants for different difficulty levels
- **Data Layouts**: Use `exercise-grid`, `stats-grid` for responsive exercise and metric layouts
- **Progress Indicators**: Standardize with `progress-ring` and gradient fills
- **Status Communication**: Consistent `difficulty-badge` variants with semantic colors
- **Interactive Elements**: Apply `exercise-card-hover` for smooth exercise card interactions

End of styling guidelines.