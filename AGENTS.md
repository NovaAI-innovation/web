# AGENTS.md - Chimera Enterprise Web

This file provides instructions for agentic coding agents (opencode, Cursor, Claude, etc.) working in this repository.

**Project**: Next.js 16 + TypeScript + Tailwind enterprise client portal for Chimera (construction/renovation). Sprint-based development. Current focus: Sprint 5 (real data, file uploads, production readiness).

## 1. Build, Lint, Test & Quality Commands

### Core Development Commands
- `npm run dev` — Start development server (localhost:3000)
- `npm run build` — Production build (MUST pass before committing major changes)
- `npm run lint` — Run ESLint across entire codebase
- `npm run typecheck` — TypeScript check (`tsc --noEmit`)
- `npm run test` — Run Vitest in watch mode
- `npm run test:run` — Run all tests once with coverage
- `npm run staging:check` — Validate staging environment config

### Testing Specific Files / Single Tests
- Run **all tests**: `npm run test:run`
- Run **single test file**: `npx vitest run src/app/api/contact/submit/route.test.ts`
- Run **specific test by name** (Vitest): `npx vitest run -t "should return success"`
- Run **Playwright E2E**: `npx playwright test`
- Run **single Playwright test**: `npx playwright test tests/visual-design.spec.ts`
- Run **specific Playwright test**: `npx playwright test -g "contact page should have accessible emergency banner"`
- Watch mode for Vitest: `npm run test`

**IMPORTANT**: After any code change, ALWAYS run:
1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

### Playwright Visual Tests
- `npx playwright test --ui` (interactive mode)
- Update screenshots: `npx playwright test --update-snapshots`

### CI/CD
- GitHub Actions run lint, typecheck, test:run, build on PRs/push to main
- Staging workflow validates Docker + health checks

## 2. Code Style & Conventions

### File Structure & Naming
- Use Next.js App Router (`src/app/`)
- Route files: `page.tsx`, `layout.tsx`, `route.ts`
- API routes: `src/app/api/[...]/route.ts`
- Components: PascalCase in `src/components/`
- Lib utilities: `src/lib/`
- Tests: co-located `.test.ts` or in `tests/`
- Docs: `docs/sprint-*.md`
- Data: `.data/*.json` (gitignored, for local persistence)

### TypeScript (tsconfig.json)
- `strict: true`
- Always use explicit types for function parameters and returns
- Prefer interfaces for objects, types for unions/primitives
- Use `React.FC` sparingly; prefer function components with typed props
- Avoid `any`; use `unknown` when appropriate
- Path aliases: `@/*` → `./src/*`

### Imports
- Group imports:
  1. External libraries (`next/`, `react/`, third-party)
  2. Internal aliases (`@/lib/`, `@/components/`)
  3. Relative imports (last)
- Use `@/` alias for all internal imports
- Sort imports alphabetically within groups
- No unused imports (enforced by ESLint)

### React & Next.js
- Server Components by default
- `'use client';` only when needed (interactivity, hooks, browser APIs)
- Use `async` server components for data fetching
- Prefer React Server Components + Server Actions over client-side fetching when possible
- Always handle loading and error states
- Next.js 16.2.0 with React 19 — read `node_modules/next/dist/docs/` for breaking changes

### Styling
- Tailwind CSS with custom theme (chimera colors)
- Use CSS variables from `globals.css` (`--accent`, `bg-chimera-*` classes)
- Premium aesthetic: dark mode, glassmorphism, neon gold accents, generous spacing, display fonts
- No inline styles
- Use `framer-motion` for purposeful animations only
- Follow existing utility classes (`glass`, `glass-elevated`, `neon-glow`, `font-display`)

### Error Handling & API
- All API routes must return consistent envelope (see `@/lib/api.ts`):
  ```ts
  { data: T, error: null } | { data: null, error: { code: ApiErrorCode, message: string, details?: unknown } }
  ```
- Use helpers: `success(data)` and `failure(code, message)`
- Structured logging with `logEvent` and request IDs
- Rate limiting on public endpoints
- Zod for all validation
- Never expose secrets

### Naming Conventions
- Functions: camelCase
- Components: PascalCase
- Constants: UPPER_SNAKE_CASE or camelCase
- Files: kebab-case for routes, PascalCase for components
- Event handlers: `handleSubmit`, `onFileDrop`

### Comments & Documentation
- NO unnecessary comments (per existing codebase style)
- Keep code self-documenting
- Document complex business logic or non-obvious decisions
- Update sprint checklists in `docs/`

### Git & PRs
- Never commit `.env*` files
- Write clear, conventional commit messages
- Run full quality gates before committing
- Only commit when explicitly requested by user

## 3. Agent Instructions
- **Always** read relevant files before editing (use read/glob/grep tools)
- Follow existing code style exactly — match formatting, imports, patterns
- When adding new components, study similar existing ones first
- For UI: maintain premium, cinematic dark aesthetic with gold accents
- Never introduce console.logs in production code
- Prefer server-side solutions
- Complete multiple planned tasks within a sprint autonomously instead of pausing for user responses between tasks, unless clarification is truly required to avoid risky assumptions
- Treat the end of each sprint as a mandatory milestone and quality gate: all required checks must pass and sprint checklist/docs must be updated before considering sprint work complete
- Update this AGENTS.md if new patterns emerge
- No Cursor rules or Copilot instructions found in repo

This document is authoritative for all agentic coding sessions in this repository.

Last updated: March 2026 (Sprint 5)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
