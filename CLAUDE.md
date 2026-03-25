# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chimera Enterprise — premium construction/renovation company. Two surfaces: public marketing site (lead gen) and authenticated client portal (project tracking, documents, messaging). Currently in **Sprint 5** (production readiness). Next.js 16 + TypeScript + Tailwind CSS.

## Commands

All commands run from `web/`:

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test:run     # Vitest single run with coverage
npx vitest run src/app/api/contact/submit/route.test.ts  # Single file
npx vitest run -t "should return success"                # Single test by name

# E2E (needs dev server running)
npx playwright test
npx playwright test tests/visual-design.spec.ts
npx playwright test -g "test name pattern"

# Staging
docker compose -f docker-compose.staging.yml up -d --build
```

**Quality gate (run before committing):** `npm run typecheck && npm run lint && npm run build`

## Architecture

### Routing (Next.js App Router)

- `src/app/page.tsx` — Landing page
- `src/app/contact/` — Public contact form
- `src/app/services/` — Services showcase
- `src/app/project-planning/` — Project planning request form
- `src/app/client-portal/` — Authenticated client area
  - `page.tsx` — Login
  - `register/`, `forgot-password/`, `reset-password/` — Auth flows
  - `dashboard/`, `projects/[id]/`, `documents/`, `messages/`, `invoices/`, `settings/` — Portal sub-routes

### API Routes

All routes return `{ data, error }` via `success()` / `failure()` from `@/lib/api`.

**Public:**
- `POST /api/contact/submit` — Lead form (Zod, rate-limited, Resend email)
- `GET /api/health` — Health check

**Portal auth (`/api/client-portal/auth/`):**
- `POST login` / `POST logout` / `POST register` — Session management via `portalToken` cookie (8-hour base64url token)
- `GET me` — Current session info
- `PUT profile` — Update name/email/phone
- `PUT password` — Change password
- `POST forgot-password` / `POST reset-password` — Reset flow (1-hour SHA-256 token)

**Portal resources (all require `requirePortalAuth()`):**
- `GET/POST /api/client-portal/messages` — List messages + send (POST triggers portal agent reply + memory entry)
- `POST /api/client-portal/messages/read` — Mark messages read
- `GET /api/client-portal/documents` — List uploads from `.data/uploads/`
- `POST /api/client-portal/documents/upload` — Multipart file upload
- `GET /api/client-portal/documents/download/[filename]` — Serve file
- `DELETE /api/client-portal/documents/[id]` — Delete file
- `GET/PUT /api/client-portal/notifications` — Notification preferences

### Auth Pattern

`src/lib/portal-auth.ts` exports `requirePortalAuth()`. Use it at the top of every portal route:

```ts
const auth = await requirePortalAuth();
if (!auth.ok) return auth.response;
const { client } = auth;
```

Client sessions are **not JWT** — they are base64url-encoded `clientId:timestamp:nonce` strings stored in an httpOnly `portalToken` cookie. Client-side auth check uses localStorage (see `src/app/client-portal/layout.tsx`).

### Data Layer

All persistence is flat JSON files in `.data/` (created at runtime). **No database.**

| File | Store module | Purpose |
|---|---|---|
| `.data/clients.json` | `@/lib/client-store` | Registered clients, password hashes, reset tokens, notification prefs |
| `.data/projects.json` | `@/lib/project-store` | Projects with milestones, budget, schedule, activity |
| `.data/invoices.json` | `@/lib/invoice-store` | Invoices with line items |
| `.data/portal-messages.json` | `@/lib/portal-messages` | Client ↔ agent message threads |
| `.data/portal-agent-memory.json` | `@/lib/portal-agent-memory` | Per-client RAG memory entries (capped at 100/client) |
| `.data/uploads/` | Documents API | Uploaded files (served directly) |
| `.data/leads.json` | `@/lib/lead-store` | Public contact form submissions |

On first registration, `initializePortalForClient()` (`@/lib/portal-init`) seeds demo projects, invoices, and a welcome message if the files don't yet exist.

### Portal Agent

`@/lib/portal-agent` — `generatePortalAgentReply()` implements a lightweight 3-layer RAG:

1. **Immutable knowledge** — hardcoded construction domain rules (safety, critical path, change orders, comms)
2. **Project artifacts** — live data from projects, invoices, uploaded files, and recent messages
3. **Conversation memory** — last 10 agent memory entries for the client

Token-based scoring ranks candidates; top 8 above score 0 are cited. Every POST to `/api/client-portal/messages` automatically generates a reply and persists a memory entry.

### Key Libraries

- `@/lib/api.ts` — `success()`, `failure()`, `ApiErrorCode` envelope
- `@/lib/observability.ts` — `logEvent()` structured JSON logging (no bare `console.log` in production code)
- `@/lib/rate-limit.ts` — In-memory rate limiting
- `@/lib/email.ts` — Resend integration
- `@/lib/tracing.ts` — OpenTelemetry setup

### Middleware

`src/middleware.ts` enforces server-side redirect for `/client-portal/*` routes (checks `portalToken` cookie). Client-side double-check in `src/app/client-portal/layout.tsx` via localStorage.

## Design System

Dark premium aesthetic with gold accents. Tailwind custom theme in `tailwind.config.js`:

- Colors: `chimera-black`, `chimera-dark`, `chimera-surface`, `chimera-gold`, `chimera-text-*`
- Fonts: Playfair Display (`font-display`) for headings, Inter (`font-sans`) for body
- Utilities in `globals.css`: `glass`, `glass-elevated`, `neon-glow`
- Animations: framer-motion for purposeful motion only

## Conventions

- Server Components by default; `'use client'` only when necessary
- `@/` maps to `./src/`
- Strict TypeScript (`strict: true`)
- Zod validation at all API boundaries
- `logEvent()` for all server-side logging

## Deployment

**CI/CD:** `.github/workflows/`
- `ci.yml` — lint + typecheck + test + build on every push/PR
- `production.yml` — deploys to `/opt/chimera-web` via SSH on push to `master` (runs CI gate first, then Docker Compose on the production server, health-checks `localhost:3000/api/health`)
- `staging.yml` / `production-readiness.yml` — staging and readiness checks

**Required GitHub secrets:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_EMAIL`, `OWNER_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ONCALL_ALERT_WEBHOOK_URL`, `OTEL_HTTP_ENDPOINT`, `XAI_API_KEY`, `ADMIN_PASSWORD`, `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_SSH_PORT`

## Sprint Status (Sprint 5 — Complete)

All Sprint 5 items delivered:
- ✅ Image optimization with `next/image`
- ✅ Expanded Playwright E2E coverage + visual regression
- ✅ Accessibility audit (axe-core WCAG 2.1 AA)
- ✅ Production Docker Compose with persistent `.data` volume

## Admin Portal

Full contractor CRM at `/admin` (password via `ADMIN_PASSWORD` env var):
- Dashboard, Clients, Projects, Invoices, Messages, Documents
- PM can reply to client messages (author `pm`)
- Contractor docs uploaded here appear in portal agent RAG
- Project milestones and activity managed from `/admin/projects/[id]`

_YOU ARE TO PERFORM SPRINTS AS AUTONOMOUSLY AS YOU CAN WITHOUT STOPPING FOR USER INTERVENTION AFTER EVERY STEP_
