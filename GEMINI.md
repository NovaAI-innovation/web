# Chimera Enterprise Web - GEMINI Context

Welcome to the **Chimera Enterprise Web** project. This document serves as the primary instructional context for all AI-assisted development.

## Project Overview

Chimera Enterprise is a premium renovation and project planning platform. This project is a **Next.js 16** (standalone) application built with **React 19**, **TypeScript**, and **Tailwind CSS**.

### Tech Stack & Core Dependencies
- **Frontend:** Next.js 16, React 19, Framer Motion, Lucide React.
- **Styling:** Tailwind CSS (Premium Dark Theme), CSS Variables, Oswald (display), Roboto (sans).
- **Backend:** Next.js Route Handlers (API).
- **Validation:** Zod.
- **Email:** Resend.
- **Logging & Observability:** Custom structured JSON logging, custom tracing, and alert systems.
- **Testing:** Vitest (unit/integration), Playwright (E2E/Visual Regression), Lighthouse CI.
- **Persistence:** Local lead storage (`.data/*.json`).

## Architecture & Conventions

### Styling & UI
- **Source of Truth:** `src/pages/Home.tsx` (and `src/app/page.tsx`) defines the primary typography, styling, and color schemes.
- **Theme:** A "Premium Dark" aesthetic using custom `chimera-*` colors defined in `tailwind.config.js`.
- **Animations:** Extensive use of `framer-motion` and custom Tailwind keyframes for "alive" UI.
- **Components:** High-quality, reusable components in `src/components`.

### API Design
- **Response Envelope:** All API responses must follow the `ApiSuccess` or `ApiError` shapes defined in `src/lib/api.ts`.
- **Validation:** Use Zod schemas (e.g., `src/lib/contact.ts`) for all incoming request payloads.
- **Rate Limiting:** Public endpoints should be protected using the `rateLimit` helper in `src/lib/rate-limit.ts`.
- **Observability:** 
  - Use `logEvent` from `src/lib/observability.ts` for structured logging.
  - Use `getRequestId` from `src/lib/request-id.ts` to maintain traceability.
  - Use `sendTrace` and `sendAlert` from `src/lib/tracing.ts` and `src/lib/alerts.ts`.

### Testing Strategy
- **Unit/Integration:** Use Vitest. Tests reside alongside source (e.g., `src/lib/contact.test.ts`).
- **E2E & Visual:** Use Playwright (`tests/` directory). Visual regression is a priority.
- **Accessibility:** Audited via `tests/accessibility-audit.spec.ts` and Lighthouse CI.

## Key Commands

- `npm run dev`: Start the development server.
- `npm run build`: Build for production (standalone output).
- `npm run lint`: Run ESLint checks.
- `npm run typecheck`: Run TypeScript type checks.
- `npm run test`: Run unit/integration tests (Vitest).
- `npm run test:run`: Run tests with coverage.
- `npm run test:e2e`: Run Playwright E2E tests.
- `npm run test:e2e:visual`: Run Playwright visual regression tests.
- `npm run lighthouse:ci`: Run Lighthouse performance/accessibility audit.
- `npm run staging:check` / `npm run production:check`: Verify environment variables.

## Deployment

The project is containerized using Docker. Deployment stacks for staging and production are managed via:
- `docker-compose.staging.yml`
- `docker-compose.production.yml`

## Development Principles

1. **Security:** Never commit secrets. Use `.env.example` as a baseline.
2. **Performance:** Prioritize Lighthouse scores; use modern image formats (AVIF/WebP).
3. **Accessibility:** Maintain WCAG compliance; ensure semantic HTML and proper ARIA labels.
4. **Resilience:** Use robust error handling and logging in all API routes.
5. **Consistency:** Adhere strictly to the established "Premium Dark" design system and structured API patterns.
