/**
 * POST /api/auth/2fa/verify
 * Body: { challengeId, otp }
 *
 * Validates a 2FA OTP challenge and issues a full session on success.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  setSessionCookies,
  getMaxAgeForRole,
  ROLE_REDIRECT,
  logAuditEvent,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  otp: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON body"), { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const { challengeId, otp } = parsed.data;

  // Rate limit per challenge: 3 attempts
  const { allowed } = rateLimit(`2fa:${challengeId}`, 3, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", "Too many attempts. Please request a new code."),
      { status: 429 },
    );
  }

  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { include: { role: true } } },
  });

  if (!challenge || challenge.completedAt) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid or expired challenge"), { status: 400 });
  }

  if (challenge.expiresAt < new Date()) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Code has expired. Please sign in again to receive a new code."),
      { status: 400 },
    );
  }

  if (challenge.attemptCount >= 3) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Maximum attempts exceeded. Please sign in again to receive a new code."),
      { status: 400 },
    );
  }

  const otpHash = createHash("sha256").update(otp).digest("hex");

  if (otpHash !== challenge.otpHash) {
    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { attemptCount: { increment: 1 } },
    });
    void logAuditEvent({ userId: challenge.userId, action: "auth.2fa_challenge_failure", ipAddress: ip });
    logEvent({ level: "error", message: "2FA code mismatch", requestId, route: "/api/auth/2fa/verify", status: 401 });
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid code"), { status: 401 });
  }

  // Mark challenge as completed
  await prisma.twoFactorChallenge.update({
    where: { id: challengeId },
    data: { completedAt: new Date() },
  });

  const { user } = challenge;
  const { token, role } = await createSession(user.id, ip, ua);
  const maxAge = getMaxAgeForRole(role);
  const redirectTo = ROLE_REDIRECT[role] ?? "/";

  const response = NextResponse.json(
    success({ id: user.id, name: user.name, email: user.email, role, redirectTo }),
  );

  setSessionCookies(response, token, role, maxAge);

  void logAuditEvent({ userId: user.id, action: "auth.2fa_challenge_success", ipAddress: ip, userAgent: ua });
  logEvent({ level: "info", message: "2FA login success", requestId, route: "/api/auth/2fa/verify", status: 200, context: { role } });

  return response;
}
