AGENTS.md

This file provides guidance to Opencode when working with code in this repository.

## Project Overview

Chimera Enterprise is a premium construction/renovation company's web platform built with Next.js 16, TypeScript, and Tailwind CSS. It has two main surfaces: a public marketing site (lead generation) and an authenticated client portal (project tracking, documents, messaging). Sprint-based development; currently in Sprint 5.

## Commands

All commands run from `web/`:

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build (run before committing)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run with coverage

# Single test file
npx vitest run src/app/api/contact/submit/route.test.ts

# Single test by name
npx vitest run -t "should return success"

# Playwright E2E (needs dev server running or uses webServer config)
npx playwright test
npx playwright test tests/visual-design.spec.ts
npx playwright test -g "test name pattern"

# Staging
npm run staging:check
docker compose -f docker-compose.staging.yml up -d --build
```

**Quality gate (run after every change):** `npm run typecheck && npm run lint && npm run build`

## Architecture

### Routing & Pages (Next.js App Router)

- `src/app/` — App Router with `page.tsx`/`layout.tsx`/`route.ts` convention
- `src/app/page.tsx` — Landing page
- `src/app/contact/` — Public contact form (lead generation)
- `src/app/services/` — Services showcase
- `src/app/project-planning/` — Project planning page
- `src/app/client-portal/` — Authenticated client area (login at root, sub-routes for dashboard/projects/documents/messages)

### API Routes

All API routes return a consistent envelope: `{ data, error }` using helpers `success()` and `failure()` from `@/lib/api`.

- `POST /api/contact/submit` — Lead submission with Zod validation, rate limiting, email via Resend
- `GET /api/health` — Health check
- `/api/client-portal/documents/` — Document management (list + upload)

### Auth

Client portal uses cookie-based auth (`portalToken` cookie) enforced by `src/middleware.ts` (server-side redirect) and `src/app/client-portal/layout.tsx` (client-side check via localStorage).

### Key Libraries

- `@/lib/api.ts` — API response envelope types and helpers (`success`, `failure`, `ApiErrorCode`)
- `@/lib/contact.ts` — Contact form Zod schema and types
- `@/lib/lead-store.ts` — Local JSON file persistence (`.data/*.json`) for leads
- `@/lib/rate-limit.ts` — In-memory rate limiting for public endpoints
- `@/lib/observability.ts` — Structured JSON logging with `logEvent()` (request IDs, route, duration)
- `@/lib/email.ts` — Resend email integration
- `@/lib/request-id.ts` — Request ID generation
- `@/lib/tracing.ts` — OpenTelemetry tracing setup

### Testing

- **Unit/integration:** Vitest with jsdom, setup in `src/test/setup.ts`, config in `vitest.config.ts`
- **E2E:** Playwright (Chromium only), tests in `tests/`, config in `playwright.config.ts`
- **CI:** GitHub Actions (`ci.yml` for quality gates, `staging.yml` for deployment)

## Design System

Dark premium aesthetic with gold accents. Custom Tailwind theme defined in `tailwind.config.js`:

- Colors: `chimera-black`, `chimera-dark`, `chimera-surface`, `chimera-gold`, `chimera-text-*`
- Fonts: Playfair Display (`font-display`) for headings, Inter (`font-sans`) for body
- Shadows: `shadow-glass`, `shadow-neon`
- Utility classes in `globals.css`: `glass`, `glass-elevated`, `neon-glow`
- Animations: framer-motion for purposeful motion only

## Conventions

- Server Components by default; `'use client'` only when needed
- `@/` path alias maps to `./src/`
- Strict TypeScript (`strict: true`)
- API routes use Zod for validation
- Structured logging via `logEvent()` — no bare `console.log` in production code
- Sprint docs live in `docs/sprint-*-checklist.md`
- Archive of planning specs in `archive/new/` (frontend, backend, auth, database, deployment, media, SEO)

## Next.js 16 Warning

This uses Next.js 16 which has breaking changes from earlier versions. Read relevant docs in `node_modules/next/dist/docs/` before writing new Next.js patterns. Do not assume APIs match your training data.


_YOU ARE TO PERFORM SPRINTS AS AUTONOMOUSLY AS YOU CAN WITHOUT STOPPING FOR USER INTERVENTION AFTER EVERY STEP_