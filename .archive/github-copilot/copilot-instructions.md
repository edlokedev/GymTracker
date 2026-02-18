# GymTracker - AI Coding Guidelines

## Project Overview

This is a **TanStack Start** application (React + TypeScript) that uses a file-based routing system with SSR capabilities. It's a modern React framework built on Vite with full-stack features including server functions and API routes.

## Tech Stack & Architecture

- **Framework**: TanStack Start (React 19 + TypeScript + Vite)
- **Routing**: TanStack Router with file-based routing in `src/routes/`
- **Styling**: Tailwind CSS v4 with `@import "tailwindcss"` in main CSS
- **Build**: Vite with custom plugins (TanStack Start, React, TypeScript paths)
- **Testing**: Vitest + React Testing Library

## Key Development Patterns

### 1. File-Based Routing Structure
- Routes are files in `src/routes/` - TanStack Router auto-generates route tree
- Route files use `createFileRoute()` pattern: `export const Route = createFileRoute('/path')({ component: MyComponent })`
- Root layout is in `src/routes/__root.tsx` with `shellComponent` pattern
- API routes use `createServerFileRoute()` with `.methods()` for HTTP handlers

### 2. Server Functions vs API Routes
- **Server Functions**: Use `createServerFn()` for type-safe server operations (see `demo.start.server-funcs.tsx`)
- **API Routes**: Use `createServerFileRoute()` for REST endpoints (see `api.demo-names.ts`)
- Server functions integrate with route loaders: `loader: async () => await getTodos()`

### 3. Component Patterns
- Components in `src/components/` with default exports
- Use TanStack Router's `Link` component for navigation, not `<a>` tags
- TypeScript strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Mobile-First Components**: All components must be designed mobile-first with responsive scaling

### 4. Styling Conventions (Tailwind v4)
Concise summary; full details live in `/.github/instructions/copilot-styling.instructions.md` (auto-applies to style & component files):
- Central config in `tailwind.config.ts`; global import & layers in `src/styles.css`.
- Use inline utilities first, extract to component class after ≥3 uses.
- Keep class strings static; avoid dynamic concatenation of utility fragments.
- Reusable classes: fitness dashboard components with semantic names
- Design tokens as CSS vars in `:root`; modern fitness dashboard theme
- See styling instructions for complete design language, component patterns, mobile-first principles, and extraction workflow.

### 5. Mobile-First Development Approach
All components must be designed mobile-first with responsive scaling:
- Start with mobile layouts and scale up using responsive breakpoints
- Ensure touch-friendly interfaces with adequate target sizes
- Progressive enhancement from mobile to desktop experiences
- Complete responsive design patterns and Tailwind classes detailed in styling instructions

## Development Workflow

### Commands
```bash
npm run dev        # Development server on port 3000
npm run build      # Production build
npm run start      # Run production build
npm run test       # Vitest tests
```

### Key Files to Understand
- `src/router.tsx` - Router configuration with type safety
- `src/routes/__root.tsx` - Root layout with head/shell components
- `vite.config.ts` - Build configuration with TanStack Start plugin
- Route files follow pattern: `src/routes/path.segment.tsx` → `/path/segment`

## TanStack Start Specifics

- Uses SSR by default with hydration
- Route loaders run on server, then hydrate client
- Server functions are type-safe RPC between client/server
- Dev tools included: TanStack Router + React devtools in development
- File-based routing generates `routeTree.gen.ts` automatically

## Common Gotchas

- Always use `createFileRoute()` for routes, not plain React components
- Server functions need `.handler()` method, API routes need `.methods()`
- Import TanStack Router's `Link`, not React Router or HTML `<a>`
- CSS imports in route heads use `?url` suffix for proper bundling
- Path aliases configured in both `tsconfig.json` and `vite.config.ts`

When adding features, follow the established patterns for routing, server functions, and component structure. The codebase demonstrates both client-side data fetching (API requests) and server-side data loading (server functions with loaders).