/**
 * POST /api/auth/login
 *
 * Unified login for all roles (client, admin, developer).
 * Returns redirectTo based on role and sets sessionToken + userRole cookies.
 * If the user has 2FA enabled, returns a challengeToken instead.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  createSession,
  setSessionCookies,
  getMaxAgeForRole,
  ROLE_REDIRECT,
  recordFailedLogin,
  clearFailedLogins,
  logAuditEvent,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { send2FACode } from "@/lib/email";
import { getRequestId } from "@/lib/request-id";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "";

  // Rate limit: 5 attempts per 15 minutes per IP
  const { allowed, retryAfterSeconds } = rateLimit(`login:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many login attempts. Try again in ${retryAfterSeconds}s.`),
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON body"), { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // Look up user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      legacySalt: true,
      accountLockedUntil: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    // Constant-time fake work to prevent timing attacks
    await verifyPassword(password, "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash");
    void logAuditEvent({ action: "auth.login.failure", ipAddress: ip, metadata: { reason: "user_not_found" } });
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid email or password"),
      { status: 401 },
    );
  }

  // Per-email rate limit: 10 failures per 15 minutes
  const emailKey = `login:email:${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
  const emailRl = rateLimit(emailKey, 10, 15 * 60 * 1000);
  if (!emailRl.allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many attempts for this account. Try again in ${emailRl.retryAfterSeconds}s.`),
      { status: 429 },
    );
  }

  // Account lock check
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    void logAuditEvent({ userId: user.id, action: "auth.login.blocked_locked", ipAddress: ip });
    return NextResponse.json(
      failure("ACCOUNT_LOCKED", "Account is temporarily locked. Please try again later or contact support."),
      { status: 403 },
    );
  }

  // Verify password (bcrypt + legacy SHA-256 upgrade path)
  const { valid, needsRehash } = await verifyPassword(password, user.passwordHash, user.legacySalt);

  if (!valid) {
    await recordFailedLogin(user.id);
    void logAuditEvent({ userId: user.id, action: "auth.login.failure", ipAddress: ip, metadata: { reason: "bad_password" } });
    logEvent({ level: "error", message: "Failed login attempt", requestId, route: "/api/auth/login", status: 401, context: { ip } });
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid email or password"),
      { status: 401 },
    );
  }

  // Transparently upgrade legacy SHA-256 hash to bcrypt on first successful login
  if (needsRehash) {
    const newHash = await hashPassword(password, user.role.name !== "client");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, legacySalt: null },
    });
  }

  await clearFailedLogins(user.id);

  // Email verification check
  if (!user.emailVerifiedAt) {
    void logAuditEvent({ userId: user.id, action: "auth.login.blocked_unverified", ipAddress: ip });
    return NextResponse.json(
      failure("EMAIL_NOT_VERIFIED", "Please verify your email address before signing in."),
      { status: 403 },
    );
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = createHash("sha256").update(otp).digest("hex");

    const challenge = await prisma.twoFactorChallenge.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send OTP via email
    try {
      await send2FACode({ to: user.email, name: user.name, otp });
    } catch (err) {
      logEvent({ level: "error", message: "Failed to send 2FA code", requestId, route: "/api/auth/login", context: { error: String(err) } });
      return NextResponse.json(failure("DEPENDENCY_FAILURE", "Could not send verification code. Please try again."), { status: 503 });
    }

    void logAuditEvent({ userId: user.id, action: "auth.2fa_challenge_issued", ipAddress: ip });

    return NextResponse.json(
      success({
        requiresTwoFactor: true,
        challengeId: challenge.id,
        email: maskEmail(user.email),
      }),
      { status: 200 },
    );
  }

  // Issue session
  const { token, role } = await createSession(user.id, ip, ua);
  const maxAge = getMaxAgeForRole(role);
  const redirectTo = ROLE_REDIRECT[role] ?? "/";

  const response = NextResponse.json(
    success({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      redirectTo,
    }),
  );

  setSessionCookies(response, token, role, maxAge);

  void logAuditEvent({ userId: user.id, action: "auth.login.success", ipAddress: ip, userAgent: ua });
  logEvent({ level: "info", message: "Login successful", requestId, route: "/api/auth/login", status: 200, context: { role, ip } });

  return response;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}
