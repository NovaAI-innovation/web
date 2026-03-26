/**
 * POST /api/client-portal/auth/login
 *
 * @deprecated Use POST /api/auth/login instead.
 * Kept for backward compatibility with the legacy client-portal login page.
 * Delegates to the unified login handler.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
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

  const { allowed, retryAfterSeconds } = rateLimit(`login:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many login attempts. Try again in ${retryAfterSeconds}s.`),
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
    include: { role: true },
  });

  if (!user || user.role.name !== "client") {
    await verifyPassword(parsed.data.password, "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash");
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid email or password"), { status: 401 });
  }

  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account is temporarily locked."), { status: 403 });
  }

  const { valid, needsRehash } = await verifyPassword(parsed.data.password, user.passwordHash, user.legacySalt);
  if (!valid) {
    await recordFailedLogin(user.id);
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid email or password"), { status: 401 });
  }

  if (needsRehash) {
    const newHash = await hashPassword(parsed.data.password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash, legacySalt: null } });
  }

  await clearFailedLogins(user.id);

  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Please verify your email address before signing in."),
      { status: 403 },
    );
  }

  const { token, role } = await createSession(user.id, ip, ua);
  const maxAge = getMaxAgeForRole(role);

  const response = NextResponse.json(success({ id: user.id, name: user.name, email: user.email }));
  setSessionCookies(response, token, role, maxAge);

  void logAuditEvent({ userId: user.id, action: "auth.login.success", ipAddress: ip });
  logEvent({ level: "info", message: "Client login", requestId, route: "/api/client-portal/auth/login", status: 200 });

  return response;
}
