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

## File Roles
- `src/styles.css`: Global import (`@import "tailwindcss";`), base resets, design tokens, component & utility layers.
- `tailwind.config.ts`: Theme extensions (`colors.brand`, fonts, `boxShadow.focus-ring`). Try to centralize design tokens here first.
- `vite.config.ts`: Includes `@tailwindcss/vite` plugin — do not remove or reorder below path alias plugin without need.

## Design Tokens
Expose tokens as CSS variables in `:root` when they need runtime reference (e.g. theming, transitions). Keep naming semantic:
```
:root {
  --color-brand: #2563eb;
  --color-brand-accent: #f59e0b;
  --color-brand-muted: #64748b;
}
```
Adding more? Mirror structure inside `tailwind.config.ts` `theme.extend` and then reference via `var(--color-*)` in custom CSS.

## Component Class Pattern
Example button (already present):
```
.btn-primary { /* explicit CSS mapping to typical Tailwind utilities */ }
```
Adding a variant:
```
.btn-danger { background:#dc2626; }
.btn-primary.btn-danger { background:#dc2626; }
```
Prefer a separate class for variant color changes; only extend base with minimal overrides.

## Utility Layer Examples
```
@layer utilities {
  .focus-ring { box-shadow:0 0 0 3px rgba(37,99,235,.4); }
}
```
Keep utilities single-purpose.

## Creating a New Reusable Pattern
1. Prototype with inline utilities in a component.
2. Confirm repetition (or conceptual reuse) ≥3 times.
3. Extract to `@layer components` with semantic name.
4. Remove duplication and ensure no dynamic class generation remains.

## Example Workflow (Card Pattern)
1. Inline prototype: `<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow" />`
2. After reuse → styles.css:
```
@layer components { .card { background:#111; border:1px solid #222; border-radius:0.75rem; padding:1rem 1.25rem; box-shadow:0 4px 12px -2px rgba(0,0,0,.4); } }
```
3. Replace all inline occurrences with `className="card"` + per-instance layout utilities like `mt-4`.

## Route & Component Integration
When adding UI via routes:
```
import { createFileRoute } from '@tanstack/react-router'
import { WorkoutCard } from '../components/WorkoutCard'

export const Route = createFileRoute('/workouts')({
  component: () => (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <h1 className="text-2xl font-bold">Workouts</h1>
      <WorkoutCard />
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
- The same visual pattern (same cluster of ≥5 utilities) appears ≥3 times OR is conceptually shared (e.g. all workout stat cards) even if not yet repeated.
- You need to enforce consistent theming across multiple routes (semantic abstraction like `.card`, `.metric-badge`).
- A pattern must be modified via variants (e.g. size, state colors) and duplication would risk divergence.

When NOT to extract:
- One-off layout wrappers (`div` with spacing & positioning).
- Minor text formatting unique to a single component.
- Experimental UI still in flux.

Decision Checklist (all YES → extract):
1. Stable design? (unlikely to churn soon)
2. Semantically nameable? (`.progress-bar`, not `.blue-box`)
3. Broadly reusable or variant-bearing?

Example (keep inline):
```tsx
<div className="flex flex-col gap-4 p-4"> ... </div>
```

Example (extract): Pattern reused in multiple dashboards:
```css
@layer components { .stat-tile { display:flex; flex-direction:column; gap:.5rem; padding:1rem; background:#111; border:1px solid #222; border-radius:.75rem; } }
```
Then in JSX:
```tsx
<div className="stat-tile">
  <span className="text-sm text-brand-muted">Volume</span>
  <span className="text-xl font-semibold">12,450 kg</span>
</div>
```

Variant extension example:
```css
@layer components {
  .badge { font-size:.625rem; letter-spacing:.05em; text-transform:uppercase; padding:.25rem .5rem; border-radius:.375rem; font-weight:600; }
  .badge-neutral { background:#1e293b; color:#e2e8f0; }
  .badge-positive { background:#065f46; color:#ecfdf5; }
  .badge-negative { background:#7f1d1d; color:#fee2e2; }
}
```

Guidelines for Components Editing (`*.tsx`):
- Keep class order logical: layout → spacing → display → sizing → typography → color → state/animation.
- Prefer grouping conceptually (e.g. `flex flex-col gap-4 p-4 rounded-lg border bg-neutral-900/60 backdrop-blur`).
- Avoid dynamic boolean concatenation; instead choose full alternative strings: `className={isActive ? 'btn-primary' : 'btn-primary btn-danger'}`.
- If toggling many mutually exclusive variants, consider a small mapping object instead of conditional fragments.

If absolute positioning or complex grid math emerges repeatedly, document rationale inline with a comment before extraction.

End of styling guidelines.