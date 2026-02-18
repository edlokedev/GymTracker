# GymTracker - AI Agent Guidelines

## Project Overview

**TanStack Start** application (React 19 + TypeScript) with file-based routing and SSR capabilities. Built on Vite with full-stack features including server functions and API routes.

## Tech Stack

- **Framework**: TanStack Start (React 19 + TypeScript + Vite)
- **Routing**: TanStack Router with file-based routing in `src/routes/`
- **Styling**: Tailwind CSS v4 with `@import "tailwindcss"` in main CSS
- **Build**: Vite with TanStack Start plugin
- **Testing**: Vitest + React Testing Library

## Key Patterns

### File-Based Routing
- Routes in `src/routes/` — auto-generates route tree
- Pattern: `export const Route = createFileRoute('/path')({ component: MyComponent })`
- Root layout: `src/routes/__root.tsx` with `shellComponent` pattern
- API routes: `createServerFileRoute()` with `.methods()` for HTTP handlers

### Server Functions vs API Routes
- **Server Functions**: `createServerFn()` for type-safe server operations
- **API Routes**: `createServerFileRoute()` for REST endpoints
- Loaders: `loader: async () => await getTodos()`

### Components
- Components in `src/components/` with default exports
- Use TanStack Router's `Link` component, not `<a>` tags
- TypeScript strict mode with path aliases (`@/*` → `./src/*`)
- **Mobile-first** design with responsive scaling

### Styling
Uses Tailwind v4 with mobile-first design. Design tokens as CSS variables in `:root`. Component patterns include `.fitness-card`, `.workout-stat`, `.exercise-badge`.

> **For detailed styling guidelines**, refer to the styling skill at `.agent/skills/styling/SKILL.md`

## Commands

```bash
npm run dev        # Development server on port 3000
npm run build      # Production build
npm run start      # Run production build
npm run test       # Vitest tests
```

## Key Files

- `src/router.tsx` — Router configuration with type safety
- `src/routes/__root.tsx` — Root layout with head/shell components
- `vite.config.ts` — Build configuration with TanStack Start plugin
- Route pattern: `src/routes/path.segment.tsx` → `/path/segment`

## Common Gotchas

- Always use `createFileRoute()` for routes, not plain React components
- Server functions need `.handler()`, API routes need `.methods()`
- Import TanStack Router's `Link`, not React Router or HTML `<a>`
- CSS imports in route heads use `?url` suffix for proper bundling
- Path aliases configured in both `tsconfig.json` and `vite.config.ts`

## TanStack Start Specifics

- Uses SSR by default with hydration
- Route loaders run on server, then hydrate client
- Server functions are type-safe RPC between client/server
- Dev tools: TanStack Router + React devtools in development
- File-based routing generates `routeTree.gen.ts` automatically
