/**
 * POST /api/admin/auth/login
 *
 * @deprecated Use POST /api/auth/login instead.
 * Kept for backward compatibility with the admin login page during migration.
 * Accepts email + password (the old password-only form is updated separately).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  setSessionCookies,
  getMaxAgeForRole,
  recordFailedLogin,
  clearFailedLogins,
  logAuditEvent,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "";

  const { allowed, retryAfterSeconds } = rateLimit(`admin-login:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    logEvent({ level: "error", message: "Admin login rate limited", requestId, route: "/api/admin/auth/login", status: 429, context: { ip } });
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many attempts. Try again in ${retryAfterSeconds}s.`),
      { status: 429 },
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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: {
      id: true,
      passwordHash: true,
      legacySalt: true,
      accountLockedUntil: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || user.role.name !== "admin") {
    await verifyPassword(parsed.data.password, "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash");
    logEvent({ level: "error", message: "Failed admin login", requestId, route: "/api/admin/auth/login", status: 401, context: { ip } });
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid email or password"), { status: 401 });
  }

  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account is temporarily locked."), { status: 403 });
  }

  const { valid, needsRehash } = await verifyPassword(parsed.data.password, user.passwordHash, user.legacySalt);
  if (!valid) {
    await recordFailedLogin(user.id);
    logEvent({ level: "error", message: "Failed admin login — wrong password", requestId, route: "/api/admin/auth/login", status: 401, context: { ip } });
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid email or password"), { status: 401 });
  }

  if (needsRehash) {
    const { hashPassword } = await import("@/lib/auth");
    const newHash = await hashPassword(parsed.data.password, true);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash, legacySalt: null } });
  }

  await clearFailedLogins(user.id);

  const { token, role } = await createSession(user.id, ip, ua);
  const maxAge = getMaxAgeForRole(role);

  const response = NextResponse.json(success({ ok: true }));
  setSessionCookies(response, token, role, maxAge);

  void logAuditEvent({ userId: user.id, action: "auth.login.success", ipAddress: ip });
  logEvent({ level: "info", message: "Admin login successful", requestId, route: "/api/admin/auth/login", status: 200, context: { ip } });

  return response;
}
