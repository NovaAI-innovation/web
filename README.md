# Chimera Enterprise Web

Sprint 1 baseline for the Chimera Enterprise platform.

## Included in Sprint 1

- Next.js 16 TypeScript application scaffold.
- First vertical slice: `POST /api/contact/submit` + `/contact` form UI.
- API response envelope and Zod validation.
- Public endpoint rate limiting guard.
- Structured request logging with request IDs.
- Local lead persistence (`.data/*.json`) for early environment testing.
- CI quality gates (lint, typecheck, tests, build, audit).
- Incident response runbook and sprint checklist docs.

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy env baseline:
   `Copy-Item .env.example .env.local`
3. Start dev server:
   `npm run dev`

## Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:run`
- `npm run build`
- `npm run staging:check`

## Staging Deployment

1. Copy `.env.staging.example` to `.env.staging`.
2. Fill staging secrets.
3. Run `npm run staging:check`.
4. Start staging stack with:
   `docker compose -f docker-compose.staging.yml up -d --build`
5. Verify:
   `GET /api/health` returns `{ data: { status: "ok" }, error: null }`.

## API Contract

### `POST /api/contact/submit`

Success response:

```json
{
  "data": { "leadId": "uuid" },
  "error": null
}
```

Error response:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR|RATE_LIMITED|DEPENDENCY_FAILURE|INTERNAL_ERROR",
    "message": "human-readable",
    "details": {}
  }
}
```
