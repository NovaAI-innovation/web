/**
 * Unified authentication module.
 *
 * Replaces the old base64url token system with bcrypt password hashing and
 * server-side sessions stored in PostgreSQL.
 *
 * Usage in API routes:
 *   const auth = await requireRole('client');
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth;
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { failure } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** bcrypt cost factor — 12 for clients, 14 for admin/developer */
const BCRYPT_ROUNDS_DEFAULT = 12;
const BCRYPT_ROUNDS_PRIVILEGED = 14;

const SESSION_DURATION: Record<string, number> = {
  client:    8  * 60 * 60 * 1000,  // 8 hours
  admin:     24 * 60 * 60 * 1000,  // 24 hours
  developer: 8  * 60 * 60 * 1000,  // 8 hours
};

const ACCOUNT_LOCK_THRESHOLD = 10;
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

export type AuthResult =
  | { ok: true; user: UserWithRole }
  | { ok: false; response: NextResponse };

// ─────────────────────────────────────────────
// Password hashing
// ─────────────────────────────────────────────

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(plain: string, privileged = false): Promise<string> {
  return bcrypt.hash(plain, privileged ? BCRYPT_ROUNDS_PRIVILEGED : BCRYPT_ROUNDS_DEFAULT);
}

/**
 * Verify a password against a stored hash.
 *
 * Supports both the new bcrypt format and the legacy SHA-256+salt format from
 * client-store.ts. Returns { valid: true, needsRehash: true } when the legacy
 * format is detected so the caller can upgrade the hash.
 */
export async function verifyPassword(
  plain: string,
  storedHash: string,
  legacySalt?: string | null,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // Bcrypt hash starts with $2b$ or $2a$
  if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$")) {
    const valid = await bcrypt.compare(plain, storedHash);
    return { valid, needsRehash: false };
  }

  // Legacy SHA-256 path
  if (legacySalt) {
    const legacyHash = createHash("sha256").update(plain + legacySalt).digest("hex");
    const valid = legacyHash === storedHash;
    return { valid, needsRehash: valid }; // if valid, caller should re-hash with bcrypt
  }

  return { valid: false, needsRehash: false };
}

// ─────────────────────────────────────────────
// Session management
// ─────────────────────────────────────────────

/**
 * Create a new server-side session. Returns the raw (unhashed) session token
 * that is placed in the httpOnly cookie.
 */
export async function createSession(
  userId: string,
  ip: string,
  userAgent: string,
): Promise<{ token: string; role: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw new Error("User not found");

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const roleName = user.role.name;
  const durationMs = SESSION_DURATION[roleName] ?? SESSION_DURATION.client;

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt: new Date(Date.now() + durationMs),
    },
  });

  return { token, role: roleName };
}

/** Destroy a session by its raw token (e.g. on logout). */
export async function destroySession(token: string): Promise<void> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => null);
}

/** Look up a session and return the full user. Returns null if expired or invalid. */
async function resolveSession(token: string): Promise<UserWithRole | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { role: true } } },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return session.user;
}

// ─────────────────────────────────────────────
// Auth guards
// ─────────────────────────────────────────────

/**
 * Validate the sessionToken cookie. Does NOT check role — use requireRole for
 * route-level access control.
 */
export async function requireAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Not authenticated"),
        { status: 401 },
      ),
    };
  }

  const user = await resolveSession(token);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Session expired or invalid"),
        { status: 401 },
      ),
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Email address not verified. Please check your inbox."),
        { status: 403 },
      ),
    };
  }

  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Account is locked. Please contact support."),
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/** Validate session AND enforce a specific role. */
export async function requireRole(roleName: string): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (auth.user.role.name !== roleName) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Access denied"),
        { status: 403 },
      ),
    };
  }

  return { ok: true, user: auth.user };
}

// ─────────────────────────────────────────────
// Account lock helpers
// ─────────────────────────────────────────────

/**
 * Increment failed login counter. Locks the account after ACCOUNT_LOCK_THRESHOLD
 * consecutive failures.
 */
export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
  });

  if (user.failedLoginCount >= ACCOUNT_LOCK_THRESHOLD) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountLockedAt: new Date(),
        accountLockedUntil: new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS),
      },
    });
  }
}

/** Reset failed login counter and clear lock on successful login. */
export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      accountLockedAt: null,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────
// Audit logging
// ─────────────────────────────────────────────

export async function logAuditEvent(params: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (err) {
    logEvent({
      level: "error",
      message: "Failed to write audit event",
      requestId: "audit",
      route: "audit",
      context: { action: params.action, error: String(err) },
    });
  }
}

// ─────────────────────────────────────────────
// Role routing map (used by login and middleware)
// ─────────────────────────────────────────────

export const ROLE_REDIRECT: Record<string, string> = {
  client:    "/client-portal/dashboard",
  admin:     "/admin/dashboard",
  developer: "/developer/dashboard",
};

// ─────────────────────────────────────────────
// Helpers for cookie-setting in API routes
// ─────────────────────────────────────────────

export function setSessionCookies(
  response: NextResponse,
  token: string,
  role: string,
  maxAgeSeconds: number,
): void {
  // Primary session cookie — httpOnly, not readable by JS
  response.cookies.set("sessionToken", token, {
    path: "/",
    maxAge: maxAgeSeconds,
    sameSite: "strict",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  // Role hint cookie — NOT httpOnly, readable by middleware for routing.
  // This is not an authorization token; security is enforced by requireRole() in API routes.
  response.cookies.set("userRole", role, {
    path: "/",
    maxAge: maxAgeSeconds,
    sameSite: "strict",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set("sessionToken", "", { path: "/", maxAge: 0 });
  response.cookies.set("userRole", "", { path: "/", maxAge: 0 });
  // Also clear legacy cookies in case of partial migration
  response.cookies.set("portalToken", "", { path: "/", maxAge: 0 });
  response.cookies.set("adminToken", "", { path: "/", maxAge: 0 });
}

export function getMaxAgeForRole(roleName: string): number {
  return Math.floor((SESSION_DURATION[roleName] ?? SESSION_DURATION.client) / 1000);
}
