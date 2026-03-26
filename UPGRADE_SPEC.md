# Chimera Enterprise — Auth, RBAC, PostgreSQL & Agent Mail Upgrade Specification

**Date:** 2026-03-25
**Sprint:** Post-Sprint 5 / Pre-Sprint 6
**Status:** Implementation-Ready Design Specification

---

## Current State Summary

| Area | Current Implementation | Problem |
|------|----------------------|---------|
| Auth — Client | SHA-256 + salt, base64url token, httpOnly cookie | Weak hash (no bcrypt), no email verification, no 2FA |
| Auth — Admin | Single env-var password, no username | No RBAC, single shared credential |
| Data | Flat JSON files in `.data/` | No relational integrity, no concurrent write safety |
| Roles | Hard-coded portal separation (client vs admin) | No developer role, no role assignment, no routing logic |
| Email | Resend | Must be replaced with Agent Mail |
| Sessions | Stateless base64url token (no DB record) | Cannot revoke, no audit trail |

---

## 1. Product / Design Changes

### 1.1 Registration Flow

**Current:** Single registration form → client account only.

**New:** Single registration form that captures role intent via a hidden or contextual channel (invitation token for admin/developer, self-service for clients). No public role picker — role is assigned server-side.

#### Registration Form Fields (Client Self-Service)
```
Full Name         [required]
Email             [required]
Phone             [required]
Password          [required, strength meter]
Confirm Password  [required]
─────────────────────────────────────────────────
☐ I agree to receive project updates and news from Chimera Enterprise.
  (Unsubscribe at any time.)           [optional — mailing list opt-in]
─────────────────────────────────────────────────
[ Create Account ]
```

**Post-submit UX:**
1. Account created in `pending_verification` state.
2. Confirmation email sent to provided address.
3. User lands on `/client-portal/verify-email` — static holding page:
   > "Check your inbox. We sent a confirmation link to **user@email.com**. The link expires in 24 hours."
4. Until email is confirmed, login is blocked with a clear message and a "Resend confirmation" link.

**Admin/Developer account creation:** No self-service registration. Accounts are created by an existing admin via the admin portal (`/admin/users/new`). The new user receives an invitation email with a one-time setup link (sets password, completes 2FA enrollment if required).

---

### 1.2 Login Flow

**Single unified login entry point:** `/login` — routes to correct portal post-authentication.

```
Email         [required]
Password      [required]
[ Sign In ]

Forgot password?  |  New client? Register here.
```

**Post-login routing decision tree:**

```
POST /api/auth/login
        │
        ▼
Credentials valid?
  No → 401, increment failed_attempts, log audit event
  Yes
        │
        ▼
Email verified?
  No → 403 "Please verify your email" + resend option
  Yes
        │
        ▼
Account locked?
  Yes → 403 "Account locked. Contact support." + log audit
  No
        │
        ▼
2FA enabled for this user?
  Yes → issue short-lived challenge token → redirect /login/verify
  No
        │
        ▼
Issue session → route by role:
  client    → /client-portal/dashboard
  admin     → /admin/dashboard
  developer → /developer/dashboard
```

---

### 1.3 Email Verification Flow

```
Register → [pending_verification state]
         → Agent Mail sends confirmation email
         → User clicks link: GET /api/auth/verify-email?token=<token>
         → Token valid & not expired?
             Yes → mark email_verified=true, redirect /login
             No  → show error page + resend option
```

**Edge cases:**
- Token expired (24h): Show "Link expired" + resend button.
- Already verified: Silent success redirect to login.
- Invalid token: 400 error page.

---

### 1.4 Optional 2FA Enrollment (Email-Based)

**Where:** `/client-portal/settings/security` and equivalent admin/developer settings pages.

**Enrollment UX:**
1. User clicks "Enable 2-Step Verification".
2. System sends a 6-digit OTP to their verified email.
3. User enters OTP to confirm enrollment.
4. 2FA is now active. Future logins trigger the challenge flow.

**Challenge UX (at login):**
```
We sent a 6-digit code to j***@email.com

[ _ _ _ _ _ _ ]   [ Verify ]

Didn't receive it? Resend code.
Code expires in 10 minutes.
```

**Disable 2FA:** Requires current password + valid OTP.

---

### 1.5 Portal Separation by Role

| Role | Login Entry | Post-Login Route | Session Duration |
|------|------------|------------------|-----------------|
| `client` | `/login` | `/client-portal/dashboard` | 8 hours |
| `admin` | `/login` | `/admin/dashboard` | 24 hours |
| `developer` | `/login` | `/developer/dashboard` | 8 hours |

**Developer portal** (new surface, minimal scope for Sprint 6):
- Access to system health, logs, API documentation, feature flags.
- Read-only view of infrastructure status.
- No client data access.

**Middleware routing:**
- `src/middleware.ts` reads role from session and enforces:
  - `/client-portal/*` requires role = `client`
  - `/admin/*` requires role = `admin`
  - `/developer/*` requires role = `developer`
  - Cross-role access → 403 page (not login redirect)

---

### 1.6 Forgot Password Flow (Updated)

Same UX as current, but:
- Reset tokens stored in PostgreSQL `password_reset_tokens` table (not in client record).
- Delivered via Agent Mail (not Resend).
- Token expires after 1 hour.
- Used token is deleted immediately on use (not just cleared).

---

### 1.7 Account Security Page (per role)

Located at `/{portal}/settings/security`:

```
─── Login & Security ───────────────────────────────
Current password      [ Change Password ]
2-Step Verification   [OFF]  [ Enable ]
Active Sessions       [ View & Revoke ]
─── Notification Preferences ───────────────────────
☑ Email me on new messages
☑ Email me on milestone updates
☐ Email me on budget changes
☐ Marketing & news emails      ← mailing list preference
[ Save Preferences ]
```

---

## 2. Authentication / Security Specification

### 2.1 RBAC Model

**Roles (stored in `roles` table):**

| Role | Description | Portal |
|------|-------------|--------|
| `client` | End customer with active project | `/client-portal` |
| `admin` | Chimera staff with full CRM access | `/admin` |
| `developer` | Internal engineering access | `/developer` |

**Permission matrix:**

| Resource | client | admin | developer |
|----------|--------|-------|-----------|
| Own profile | read/write | — | — |
| Own projects | read | read/write | — |
| Own invoices | read | read/write | — |
| Own messages | read/write | — | — |
| Own documents | read/upload | — | — |
| All clients | — | read/write | — |
| All projects | — | read/write | — |
| All invoices | — | read/write | — |
| All messages | — | read/write | — |
| System logs | — | read | read/write |
| API health | — | read | read/write |
| User management | — | read/write | read |
| Feature flags | — | read | read/write |

**Implementation assumption:** Single-role-per-user is sufficient for this CRM. The `user_roles` table supports many-to-many if future expansion requires it, but no UI for multi-role assignment is needed in Sprint 6.

---

### 2.2 Post-Login Routing by Role

Implemented in the login API route:

```typescript
// src/app/api/auth/login/route.ts
const roleRoutes: Record<string, string> = {
  client:    '/client-portal/dashboard',
  admin:     '/admin/dashboard',
  developer: '/developer/dashboard',
};
return success({ redirectTo: roleRoutes[user.role] ?? '/login' });
```

Client-side login handler reads `redirectTo` from response and uses `router.push()`.

---

### 2.3 Email Confirmation Flow

**Token generation:**
- 32-byte cryptographically random token (`crypto.randomBytes(32).toString('hex')`).
- Stored in `email_confirmations` table (hashed with SHA-256).
- Expires 24 hours after creation.

**Enforcement:** `requireAuth()` middleware checks `email_verified_at IS NOT NULL`. Unverified users accessing protected routes receive `403 EMAIL_NOT_VERIFIED`.

---

### 2.4 Optional Email-Based 2FA Flow

**OTP generation:**
- 6-digit numeric code (`Math.floor(100000 + Math.random() * 900000)`).
- Stored in `two_factor_challenges` table (hashed).
- Expires 10 minutes after creation.
- Maximum 3 attempts before invalidation (new code required).

**Challenge token:**
- On credential success with 2FA enabled, issue a short-lived (5-minute) `challengeToken` cookie.
- `challengeToken` is a signed JWT (HMAC-SHA256, server secret) containing `{ userId, exp }`.
- This token only unlocks the `/api/auth/2fa/verify` endpoint — it cannot access any other route.
- On successful OTP: issue full session token, clear challenge token.

---

### 2.5 Authentication Hardening Measures

#### Password Storage
- **Algorithm:** bcrypt with cost factor 12 (minimum; 14 for admin/developer).
- **Migration:** On first login with old SHA-256 hash, validate with legacy function, then re-hash with bcrypt and store.
- **Rationale:** SHA-256 + salt is not a password hashing algorithm. bcrypt is time-hardened.

#### Session Security
- **Storage:** Sessions stored in PostgreSQL `sessions` table (server-side).
- **Token format:** 32-byte random hex string (opaque reference to DB row).
- **Cookie:** `httpOnly=true`, `sameSite=Strict`, `secure=true` (production), `path=/`.
- **Expiry:** DB row has `expires_at`; cookie `maxAge` matches.
- **Rotation:** Issue new session token on privilege escalation (2FA completion).
- **Revocation:** DELETE row from `sessions` table on logout or security event.

#### Rate Limiting / Brute-Force Protection
- **Login:** 5 failures per 15 minutes per IP → 429 with `Retry-After` header.
- **Login:** 10 failures per 15 minutes per email → account lock (30-minute automatic unlock or manual admin unlock).
- **Password reset:** 3 requests per hour per email.
- **2FA verify:** 3 attempts per challenge token before invalidation.
- **Registration:** 5 per hour per IP.
- **Implementation:** Move from in-memory to Redis (or Postgres `rate_limits` table for simpler ops) to survive restarts.

#### CSRF Protection
- **SameSite=Strict** cookie attribute prevents cross-site requests in modern browsers.
- **Double-submit pattern** for state-mutating form endpoints: include CSRF token in form body (sourced from a `csrfToken` cookie readable by JS) and validate server-side.
- **Assumption:** Next.js App Router Server Actions have built-in CSRF protection. For API routes, apply CSRF validation middleware.

#### Email Verification Enforcement
- `requireAuth()` returns `403 EMAIL_NOT_VERIFIED` for unverified users.
- UI shows persistent banner: "Verify your email to access all features."
- Admin can manually verify accounts (for support cases).

#### Least-Privilege Access Control
- `requireRole(role: string)` middleware wraps `requireAuth()`.
- All `/admin/*` API routes call `requireRole('admin')`.
- All `/client-portal/*` API routes call `requireRole('client')`.
- Data queries always include `WHERE user_id = $currentUserId` for client-scoped resources.
- Admin queries are unrestricted but audited.

#### Auditability
- `audit_events` table records: user_id, action, resource_type, resource_id, ip_address, user_agent, metadata (JSONB), created_at.
- Audited events:
  - `auth.login.success` / `auth.login.failure`
  - `auth.logout`
  - `auth.email_verify`
  - `auth.password_reset_request` / `auth.password_reset_complete`
  - `auth.2fa_enable` / `auth.2fa_disable` / `auth.2fa_challenge_success` / `auth.2fa_challenge_failure`
  - `auth.account_locked` / `auth.account_unlocked`
  - `auth.session_revoked`
  - `admin.user_create` / `admin.user_delete` / `admin.role_change`

#### Assumptions
1. Redis is not required if rate limiting is implemented via PostgreSQL with a `rate_limits` table and a cleanup cron. Redis is preferred for production scale but not mandatory for Sprint 6.
2. HTTPS is enforced at the infrastructure level (Nginx/Cloudflare). The app assumes `secure` cookies are valid in production.
3. Passkeys/TOTP are future enhancements. Email OTP is the accepted 2FA mechanism for Sprint 6.

---

## 3. Database / Data Architecture

### 3.1 Migration Strategy

Replace all flat `.data/*.json` stores with PostgreSQL. Use **Prisma** as the ORM:
- Type-safe queries
- Auto-generated migrations
- Works with Next.js App Router Server Components

**Connection:** `DATABASE_URL` env var → Prisma Client singleton in `src/lib/prisma.ts`.

---

### 3.2 Core Schema

```sql
-- ─────────────────────────────────────────────────
-- IDENTITY & ACCESS
-- ─────────────────────────────────────────────────

CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,   -- 'client', 'admin', 'developer'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  phone               VARCHAR(50),
  password_hash       VARCHAR(255) NOT NULL,   -- bcrypt
  role_id             INT NOT NULL REFERENCES roles(id),
  email_verified_at   TIMESTAMPTZ,             -- NULL = not verified
  account_locked_at   TIMESTAMPTZ,             -- NULL = not locked
  account_locked_until TIMESTAMPTZ,
  failed_login_count  INT NOT NULL DEFAULT 0,
  last_login_at       TIMESTAMPTZ,
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  mailing_list_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- ─────────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────────

CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 of session token
  ip_address  INET,
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ─────────────────────────────────────────────────
-- EMAIL VERIFICATION
-- ─────────────────────────────────────────────────

CREATE TABLE email_confirmations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 of sent token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,                   -- NULL = not yet used
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_confirmations_token_hash ON email_confirmations(token_hash);
CREATE INDEX idx_email_confirmations_user_id ON email_confirmations(user_id);

-- ─────────────────────────────────────────────────
-- PASSWORD RESET
-- ─────────────────────────────────────────────────

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- ─────────────────────────────────────────────────
-- 2FA CHALLENGES
-- ─────────────────────────────────────────────────

CREATE TABLE two_factor_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash        VARCHAR(64) NOT NULL,            -- SHA-256 of 6-digit OTP
  attempt_count   INT NOT NULL DEFAULT 0,          -- max 3 before invalidation
  expires_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_2fa_challenges_user_id ON two_factor_challenges(user_id);

-- ─────────────────────────────────────────────────
-- AUDIT EVENTS
-- ─────────────────────────────────────────────────

CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,   -- NULL = anonymous
  action        VARCHAR(100) NOT NULL,    -- e.g. 'auth.login.success'
  resource_type VARCHAR(100),             -- e.g. 'user', 'project', 'invoice'
  resource_id   VARCHAR(255),
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,                    -- flexible extra context
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- ─────────────────────────────────────────────────
-- RATE LIMITS (Postgres-based, replaces in-memory)
-- ─────────────────────────────────────────────────

CREATE TABLE rate_limits (
  key         VARCHAR(255) PRIMARY KEY,  -- e.g. 'login:ip:1.2.3.4'
  count       INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
-- CRM DATA
-- ─────────────────────────────────────────────────

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'planning',  -- planning|active|completed
  progress        INT NOT NULL DEFAULT 0,    -- 0–100, computed from milestones
  budget_allocated NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  baseline_end    DATE,
  current_end     DATE,
  days_variance   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_client_id ON projects(client_id);

CREATE TABLE milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  due_date    DATE,
  weight      INT NOT NULL DEFAULT 1,     -- for weighted progress calc
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);

CREATE TABLE project_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,   -- milestone|document|note|budget
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_activity_project_id ON project_activity(project_id);

CREATE TABLE invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id),
  number        VARCHAR(50) UNIQUE NOT NULL,
  status        VARCHAR(50) NOT NULL DEFAULT 'pending',   -- paid|pending|overdue
  issued_date   DATE NOT NULL,
  due_date      DATE NOT NULL,
  paid_date     DATE,
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_final_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

CREATE TABLE invoice_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC(10,2) NOT NULL,
  unit_price    NUMERIC(12,2) NOT NULL,
  total         NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

CREATE TABLE portal_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author          VARCHAR(50) NOT NULL,   -- client|pm|system|agent
  body            TEXT NOT NULL,
  reasoning       TEXT,                   -- agent reasoning chain
  read_by_client  BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_filename    VARCHAR(255),
  attachment_original_name VARCHAR(255),
  attachment_size INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_messages_client_id ON portal_messages(client_id);
CREATE INDEX idx_portal_messages_created_at ON portal_messages(created_at);

CREATE TABLE portal_agent_memory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query            TEXT NOT NULL,
  response_summary TEXT NOT NULL,
  artifact_refs    TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_agent_memory_client_id ON portal_agent_memory(client_id);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  filename        VARCHAR(255) NOT NULL,   -- stored filename (UUID-based)
  original_name   VARCHAR(255) NOT NULL,
  size            BIGINT NOT NULL,
  mime_type       VARCHAR(100),
  is_contractor_doc BOOLEAN NOT NULL DEFAULT FALSE,   -- visible in agent RAG
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  project_type    VARCHAR(100),
  timeline        VARCHAR(100),
  budget          VARCHAR(100),
  source          VARCHAR(100),
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
-- NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────────────
-- Stored on users.mailing_list_opt_in + separate prefs table

CREATE TABLE notification_preferences (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_messages  BOOLEAN NOT NULL DEFAULT TRUE,
  email_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  email_budget    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.3 Prisma Schema Excerpt

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(50)
  description String?
  users       User[]
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("roles")
}

model User {
  id                  String    @id @default(uuid()) @db.Uuid
  name                String    @db.VarChar(255)
  email               String    @unique @db.VarChar(255)
  phone               String?   @db.VarChar(50)
  passwordHash        String    @map("password_hash") @db.VarChar(255)
  roleId              Int       @map("role_id")
  role                Role      @relation(fields: [roleId], references: [id])
  emailVerifiedAt     DateTime? @map("email_verified_at")
  accountLockedAt     DateTime? @map("account_locked_at")
  accountLockedUntil  DateTime? @map("account_locked_until")
  failedLoginCount    Int       @default(0) @map("failed_login_count")
  lastLoginAt         DateTime? @map("last_login_at")
  twoFactorEnabled    Boolean   @default(false) @map("two_factor_enabled")
  mailingListOptIn    Boolean   @default(false) @map("mailing_list_opt_in")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  sessions            Session[]
  emailConfirmations  EmailConfirmation[]
  passwordResetTokens PasswordResetToken[]
  twoFactorChallenges TwoFactorChallenge[]
  auditEvents         AuditEvent[]
  projects            Project[]
  invoices            Invoice[]
  portalMessages      PortalMessage[]
  agentMemory         PortalAgentMemory[]
  documents           Document[]
  notificationPrefs   NotificationPreference?

  @@map("users")
}
```

---

### 3.4 Data Migration from JSON Stores

**Migration script** (`scripts/migrate-json-to-postgres.ts`):
1. Read `.data/clients.json` → insert into `users` (role=client) + `notification_preferences`.
2. Read `.data/projects.json` → insert into `projects` + `milestones` + `project_activity`.
3. Read `.data/invoices.json` → insert into `invoices` + `invoice_line_items`.
4. Read `.data/portal-messages.json` → insert into `portal_messages`.
5. Read `.data/portal-agent-memory.json` → insert into `portal_agent_memory`.
6. Read `.data/leads.json` → insert into `leads`.
7. Set all existing users `email_verified_at = created_at` (grandfather existing accounts).
8. Password hashes: existing SHA-256 hashes stored temporarily; force re-hash on next login (see §2.5).

---

## 4. Email Infrastructure Changes

### 4.1 Replace Resend with Agent Mail

**Remove:** `resend` npm package, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` env vars.

**Add:** Agent Mail integration via `src/lib/email.ts` (rewrite).

**New env vars:**
```
AGENT_MAIL_API_KEY=...
AGENT_MAIL_FROM_EMAIL=noreply@chimeraenterprise.com
AGENT_MAIL_FROM_NAME=Chimera Enterprise
```

**Assumption:** Agent Mail provides an HTTP API or SDK. The implementation below uses a generic HTTP adapter pattern. Replace with Agent Mail's actual SDK/API calls.

```typescript
// src/lib/email.ts

const AGENT_MAIL_BASE = 'https://api.agentmail.to/v1';

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!process.env.AGENT_MAIL_API_KEY) {
    logEvent('email.skipped', { to, subject });
    return 'skipped';
  }
  const res = await fetch(`${AGENT_MAIL_BASE}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AGENT_MAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${process.env.AGENT_MAIL_FROM_NAME} <${process.env.AGENT_MAIL_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    logEvent('email.send_failed', { to, subject, status: res.status });
    throw new Error(`Agent Mail send failed: ${res.status}`);
  }
  logEvent('email.sent', { to, subject });
  return 'sent';
}
```

---

### 4.2 Transactional Email Types

#### 1. Email Confirmation
- **Trigger:** Registration
- **Subject:** "Confirm your Chimera Enterprise account"
- **Body:** Confirmation link `https://chimeraenterprise.com/api/auth/verify-email?token=<token>`
- **Expiry note:** "This link expires in 24 hours."
- **Agent Mail usage:** `sendEmailConfirmation(user.email, user.name, token)`

#### 2. Password Reset
- **Trigger:** Forgot password request
- **Subject:** "Reset your Chimera Enterprise password"
- **Body:** Reset link `https://chimeraenterprise.com/client-portal/reset-password?token=<token>`
- **Expiry note:** "This link expires in 1 hour."
- **Agent Mail usage:** `sendPasswordReset(user.email, user.name, token)`

#### 3. 2FA OTP Code
- **Trigger:** Login with 2FA enabled
- **Subject:** "Your Chimera Enterprise login code"
- **Body:** "Your verification code is: **123456**. It expires in 10 minutes."
- **Security note:** "If you didn't request this, change your password immediately."
- **Agent Mail usage:** `send2FACode(user.email, user.name, otp)`

#### 4. Security Alert (Recommended)
- **Trigger:** Login from new IP, account lock, password change
- **Subject:** "Security alert: [action] on your Chimera Enterprise account"
- **Body:** Action details, timestamp, IP address; link to revoke sessions.
- **Agent Mail usage:** `sendSecurityAlert(user.email, user.name, action, metadata)`

#### 5. Admin Invitation
- **Trigger:** Admin creates new admin/developer account
- **Subject:** "You've been invited to Chimera Enterprise"
- **Body:** One-time setup link (48-hour expiry), role description.
- **Agent Mail usage:** `sendAdminInvitation(email, role, setupToken)`

#### 6. Lead Notification (replaces current Resend lead email)
- **Trigger:** Public contact form submission
- **Subject:** "New lead: [name] — [project type]"
- **Body:** Structured lead details.
- **Agent Mail usage:** `sendLeadNotification(lead)`

#### 7. Mailing List Welcome (Optional)
- **Trigger:** Registration with `mailing_list_opt_in = true`
- **Subject:** "Welcome to Chimera Enterprise updates"
- **Body:** Confirmation of opt-in + unsubscribe link.
- **Note:** Only send if `mailing_list_opt_in = true`. No emails to opted-out users.
- **Agent Mail usage:** `sendMailingListWelcome(user.email, user.name)`

---

### 4.3 Agent Mail in Auth Lifecycle

```
Registration
  → sendEmailConfirmation()     [required, blocks portal access]
  → sendMailingListWelcome()    [optional, if opt-in]

Login (2FA enabled)
  → send2FACode()               [required to complete login]

Forgot Password
  → sendPasswordReset()         [required to reset]

Security Events
  → sendSecurityAlert()         [recommended, async, non-blocking]

Admin Invitation
  → sendAdminInvitation()       [required for admin/developer onboarding]
```

---

## 5. Implementation Plan

### Phase 1 — Foundation (Security-Critical First)

**Goal:** Replace SHA-256 with bcrypt, move sessions to PostgreSQL, establish RBAC roles.

**Steps:**
1. Add PostgreSQL + Prisma (`npm install prisma @prisma/client bcryptjs`).
2. Create initial migration: `roles`, `users`, `sessions`, `audit_events`.
3. Seed roles: `client`, `admin`, `developer`.
4. Rewrite `src/lib/auth.ts` (new unified module):
   - `hashPassword(plain)` → bcrypt cost 12
   - `verifyPassword(plain, hash)` → bcrypt compare + legacy SHA-256 upgrade path
   - `createSession(userId, ip, ua)` → insert into sessions, return token
   - `getSession(token)` → lookup by token hash, check expiry
   - `destroySession(token)` → delete row
   - `requireAuth(request)` → reads cookie, validates session, returns user+role
   - `requireRole(role)` → wraps requireAuth, checks role
5. Migrate admin auth to use `users` table with role=admin.
6. Run JSON→Postgres migration for clients.
7. Update all 8 client-portal auth API routes to use new auth module.
8. Update middleware to use role-based routing.
9. **Validation checkpoint:** All existing logins work, sessions persist across restarts.

**Dependencies:** `DATABASE_URL` in env, Postgres instance running.
**Risk:** SHA-256 migration path must be verified against test accounts before deploy.

---

### Phase 2 — Email Verification + Agent Mail

**Goal:** Enforce email confirmation in account lifecycle; replace Resend.

**Steps:**
1. Create migration: `email_confirmations`, `password_reset_tokens`.
2. Remove `resend` package. Install Agent Mail SDK (or implement fetch-based adapter).
3. Rewrite `src/lib/email.ts` with Agent Mail adapter + all 7 email types.
4. Update registration route: set `emailVerifiedAt = null`, send confirmation email.
5. Add `GET /api/auth/verify-email` route.
6. Add `/client-portal/verify-email` UI page (holding page + resend).
7. Add `POST /api/auth/resend-verification` (rate-limited to 3/hour/email).
8. Update `requireAuth()` to check `emailVerifiedAt` and return `403 EMAIL_NOT_VERIFIED`.
9. Update login flow to show verification prompt for unverified users.
10. **Validation checkpoint:** New registration requires email click before portal access. Resend integration is dead.

**Dependencies:** Phase 1 complete, Agent Mail API key available.
**Risk:** Grandfather clause needed — existing users should have `emailVerifiedAt = createdAt`.

---

### Phase 3 — Role-Based Routing + Developer Portal Scaffold

**Goal:** Unified login routes to correct portal by role; developer portal stub.

**Steps:**
1. Create `/login` unified page (remove separate admin login at `/admin`).
2. Update login API route to return `redirectTo` based on role.
3. Update middleware routing rules for `/client-portal`, `/admin`, `/developer`.
4. Create `src/app/developer/` with layout + placeholder dashboard.
5. Add 403 pages for cross-role access attempts.
6. **Validation checkpoint:** Client login → `/client-portal/dashboard`. Admin login → `/admin/dashboard`. Cross-portal access → 403.

**Dependencies:** Phase 1 complete.
**Risk:** Admin portal currently has its own login page — redirect `/admin` to `/login` for password users.

---

### Phase 4 — Optional 2FA

**Goal:** Email-based OTP 2FA as opt-in feature.

**Steps:**
1. Create migration: `two_factor_challenges`.
2. Add `two_factor_enabled` column to `users` (already in schema above).
3. Update login route: if `twoFactorEnabled`, issue challenge token + send OTP.
4. Add `/login/verify` 2FA challenge UI page.
5. Add `POST /api/auth/2fa/verify` route (validates OTP, issues full session).
6. Add `POST /api/auth/2fa/enable` / `POST /api/auth/2fa/disable` routes.
7. Add 2FA enrollment UI in `/{portal}/settings/security`.
8. Add `send2FACode()` email function.
9. **Validation checkpoint:** User with 2FA enabled cannot access portal without completing OTP step.

**Dependencies:** Phase 2 complete (Agent Mail required to deliver OTP).
**Risk:** OTP delivery failure blocks login. Add fallback contact (support email) in 2FA UI.

---

### Phase 5 — Migrate Remaining Data Stores to PostgreSQL

**Goal:** Projects, invoices, messages, documents, leads all in Postgres.

**Steps:**
1. Create migrations for all remaining tables (see §3.2).
2. Rewrite store modules as Prisma-based repositories:
   - `src/lib/project-store.ts` → `src/lib/projects.ts`
   - `src/lib/invoice-store.ts` → `src/lib/invoices.ts`
   - `src/lib/portal-messages.ts` → `src/lib/messages.ts`
   - `src/lib/portal-agent-memory.ts` → `src/lib/agent-memory.ts`
   - `src/lib/lead-store.ts` → `src/lib/leads.ts`
3. Run data migration script (JSON → Postgres).
4. Update all API routes to use new store modules.
5. Update `portal-init.ts` to write to Postgres.
6. Remove `.data/` file reads/writes from production code.
7. Update `docker-compose.yml` to add PostgreSQL service with persistent volume.
8. **Validation checkpoint:** All portal data survives container restart. Admin portal shows correct client data.

**Dependencies:** Phases 1–3 complete, migration script tested on a copy of `.data/`.
**Risk:** `unstable_cache()` with file-based revalidation → replace with Prisma + Next.js `revalidateTag()`.

---

### Phase 6 — Hardening + Audit

**Goal:** Full security hardening checklist complete.

**Steps:**
1. Migrate rate limiting from in-memory to `rate_limits` table (or Redis).
2. Add CSRF token middleware for all state-mutating form endpoints.
3. Add `audit_events` table + `logAuditEvent()` helper used in all auth routes.
4. Add account lock logic (10 failures → 30-min lock + audit event + security email).
5. Add session revocation UI (`/{portal}/settings/security → Active Sessions`).
6. Add admin invitation flow (`/admin/users/new` → sends invite email).
7. Add mailing list opt-in to registration form + `sendMailingListWelcome()`.
8. Add `notification_preferences` table + settings UI.
9. **Final validation checkpoint:** Full OWASP auth checklist pass. Security audit log populated for all auth events.

**Dependencies:** All previous phases.

---

## 6. Deliverables Format

### 6.1 RBAC

| | |
|---|---|
| **Required change** | Introduce `roles` table and `role_id` on `users`. Route users to correct portal post-login. Enforce `requireRole()` on all protected API routes. |
| **Rationale** | Current system has hard-coded portal separation with no programmatic role concept. Adding a developer role and admin invitation flow requires a proper role model. |
| **Implementation note** | Single-role-per-user via FK is sufficient. `user_roles` many-to-many junction table is in the schema but not required for Sprint 6 UI. |
| **Risk / Dependency** | Admin password currently in env var. Must migrate admin to a `users` row before deploying unified login. Risk: existing admin session cookie format changes — require re-login after deploy. |

---

### 6.2 Unified Login + Role Routing

| | |
|---|---|
| **Required change** | Replace separate `/admin` login and `/client-portal` login with single `/login` page. Post-auth redirect based on role. |
| **Rationale** | Two login surfaces increase maintenance surface and confuse role-based routing. Unified login simplifies middleware and UX. |
| **Implementation note** | Admin login currently relies on `ADMIN_PASSWORD` env var. Sprint 6 migrates admin to the `users` table. Existing `adminToken` cookie format becomes invalid — coordinate deploy with active admin session awareness. |
| **Risk / Dependency** | If admin users are mid-session during deploy, they will be logged out. Acceptable for a low-traffic admin surface. |

---

### 6.3 Email Confirmation

| | |
|---|---|
| **Required change** | Set `email_verified_at = null` on registration. Block portal access until verified. Deliver confirmation link via Agent Mail. |
| **Rationale** | Current system grants portal access immediately on registration with no email ownership verification. This is below minimum CRM security baseline. |
| **Implementation note** | Grandfather existing accounts by setting `email_verified_at = created_at` in migration. New accounts require verification. |
| **Risk / Dependency** | Agent Mail must be operational before deploying this phase. If Agent Mail is down, new users cannot verify. Add a grace period or manual admin verify as fallback. |

---

### 6.4 Optional Email 2FA

| | |
|---|---|
| **Required change** | Add `two_factor_enabled` to users. Implement OTP challenge flow. Add enrollment UI in settings. |
| **Rationale** | Email-based 2FA is an acceptable interim security layer for a CRM handling construction project data and billing information. |
| **Implementation note** | OTP stored as SHA-256 hash in `two_factor_challenges`. Challenge token is a short-lived (5-min) signed JWT. Do not reuse session token for challenge state. |
| **Risk / Dependency** | Email delivery latency can frustrate users. OTP expiry should be 10 minutes minimum. TOTP (authenticator app) is a preferred future upgrade — schema supports adding it without migration. |

---

### 6.5 bcrypt Password Hashing

| | |
|---|---|
| **Required change** | Replace SHA-256+salt with bcrypt (cost 12 for clients, 14 for admin/developer). Add legacy upgrade path on first login. |
| **Rationale** | SHA-256 is a fast hash — purpose-built password hashing (bcrypt, argon2) is required for any production CRM. The current implementation is objectively below minimum security baseline. |
| **Implementation note** | On login: detect old hash format (length/prefix), validate with legacy function, re-hash with bcrypt, update DB. Store legacy hash format detection by absence of `$2b$` prefix. |
| **Risk / Dependency** | Must complete before any public traffic reaches the system. No dependency other than `bcryptjs` package. |

---

### 6.6 Server-Side Sessions (PostgreSQL)

| | |
|---|---|
| **Required change** | Replace stateless base64url token with opaque session token pointing to a `sessions` DB row. |
| **Rationale** | Current tokens cannot be revoked. If a token is stolen, it is valid until expiry. Server-side sessions allow instant revocation. |
| **Implementation note** | Store SHA-256(sessionToken) in DB (not raw token). Cookie carries raw token. This prevents DB compromise from yielding valid tokens. |
| **Risk / Dependency** | Session DB adds a latency hit per request. Mitigate with `sessions` table index on `token_hash`. For MVP, connection pooling via Prisma is sufficient. PgBouncer is optional future optimization. |

---

### 6.7 PostgreSQL Migration

| | |
|---|---|
| **Required change** | Replace all flat JSON stores with Prisma-managed PostgreSQL. |
| **Rationale** | JSON files have no concurrent write safety, no referential integrity, and no query capability. PostgreSQL is the correct storage layer for a CRM with relational data. |
| **Implementation note** | Run migration script in a one-time job against production `.data/` backup. Keep `.data/` read-only for 1 sprint as rollback option. |
| **Risk / Dependency** | Requires Postgres in Docker Compose and on production server. `DATABASE_URL` must be added to GitHub Secrets for CI/CD. `docker-compose.yml` must add a `postgres` service with named volume for persistence. |

---

### 6.8 Agent Mail Integration

| | |
|---|---|
| **Required change** | Remove Resend. Implement Agent Mail adapter in `src/lib/email.ts`. Use for all 7 email types. |
| **Rationale** | Per project requirements. Agent Mail replaces Resend as the delivery infrastructure. |
| **Implementation note** | Wrap Agent Mail calls with the same `"sent" | "skipped"` return pattern. Log failures with `logEvent()`. Throw on delivery failure for blocking emails (confirmation, reset, OTP) so the caller can surface an error to the user. |
| **Risk / Dependency** | Agent Mail API key and docs needed before Phase 2. If Agent Mail has domain verification requirements, configure `chimeraenterprise.com` DNS records before deploy. |

---

### 6.9 Mailing List Opt-In

| | |
|---|---|
| **Required change** | Add optional checkbox to registration form. Store as `mailing_list_opt_in` on `users`. Send welcome email if opted in. |
| **Rationale** | Marketing opt-in during registration is standard practice. Opt-out (unchecked default) is GDPR-compliant. |
| **Implementation note** | Preference is editable in `/{portal}/settings/security` (notification prefs section). Unsubscribe link in all marketing emails must set `mailing_list_opt_in = false`. |
| **Risk / Dependency** | Do not conflate mailing list with transactional emails. Transactional emails (password reset, OTP, security alerts) are always sent regardless of this preference. |

---

## Appendix: New Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chimera_production

# Agent Mail (replaces Resend)
AGENT_MAIL_API_KEY=...
AGENT_MAIL_FROM_EMAIL=noreply@chimeraenterprise.com
AGENT_MAIL_FROM_NAME=Chimera Enterprise

# Session signing (new)
SESSION_SECRET=<32-byte-random-hex>

# Remove these:
# RESEND_API_KEY
# RESEND_FROM_EMAIL
```

---

## Appendix: Files Created / Modified

| File | Action | Phase |
|------|---------|-------|
| `prisma/schema.prisma` | Create | 1 |
| `prisma/migrations/` | Create | 1+ |
| `src/lib/prisma.ts` | Create | 1 |
| `src/lib/auth.ts` | Create (replaces portal-auth + admin-auth) | 1 |
| `src/lib/email.ts` | Rewrite | 2 |
| `src/app/login/page.tsx` | Create (unified login) | 3 |
| `src/app/login/verify/page.tsx` | Create (2FA challenge) | 4 |
| `src/app/client-portal/verify-email/page.tsx` | Create | 2 |
| `src/app/developer/` | Create (scaffold) | 3 |
| `src/middleware.ts` | Modify (role-based routing) | 3 |
| `src/app/api/auth/login/route.ts` | Create (unified, replaces dual login routes) | 3 |
| `src/app/api/auth/register/route.ts` | Create | 2 |
| `src/app/api/auth/verify-email/route.ts` | Create | 2 |
| `src/app/api/auth/2fa/verify/route.ts` | Create | 4 |
| `src/app/api/auth/2fa/enable/route.ts` | Create | 4 |
| `src/lib/project-store.ts` | Rewrite (Prisma) | 5 |
| `src/lib/invoice-store.ts` | Rewrite (Prisma) | 5 |
| `src/lib/portal-messages.ts` | Rewrite (Prisma) | 5 |
| `src/lib/portal-agent-memory.ts` | Rewrite (Prisma) | 5 |
| `src/lib/lead-store.ts` | Rewrite (Prisma) | 5 |
| `src/lib/rate-limit.ts` | Modify (Postgres-backed) | 6 |
| `scripts/migrate-json-to-postgres.ts` | Create | 5 |
| `docker-compose.yml` | Modify (add postgres service) | 1 |
| `.github/workflows/production.yml` | Modify (DATABASE_URL secret) | 1 |
