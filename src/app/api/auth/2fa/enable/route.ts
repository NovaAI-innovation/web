/**
 * POST /api/auth/2fa/enable
 *
 * Sends a 6-digit OTP to the authenticated user's email to confirm 2FA enrollment.
 * After OTP verification, 2FA is activated.
 *
 * Two-step flow:
 *   1. POST /api/auth/2fa/enable               → sends OTP, returns challengeId
 *   2. POST /api/auth/2fa/enable/confirm        → verifies OTP, activates 2FA
 */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAuth, logAuditEvent } from "@/lib/auth";
import { send2FACode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { user } = auth;

  if (user.twoFactorEnabled) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "2FA is already enabled on this account"),
      { status: 409 },
    );
  }

  // Rate limit 2FA enable attempts
  const { allowed } = rateLimit(`2fa-enable:${user.id}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(failure("RATE_LIMITED", "Too many attempts. Try again later."), { status: 429 });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = createHash("sha256").update(otp).digest("hex");

  const challenge = await prisma.twoFactorChallenge.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    await send2FACode({ to: user.email, name: user.name, otp });
  } catch (err) {
    logEvent({ level: "error", message: "Failed to send 2FA enrollment code", requestId, route: "/api/auth/2fa/enable", context: { error: String(err) } });
    return NextResponse.json(failure("DEPENDENCY_FAILURE", "Could not send verification code. Please try again."), { status: 503 });
  }

  void logAuditEvent({ userId: user.id, action: "auth.2fa_enrollment_started", ipAddress: ip });

  return NextResponse.json(
    success({
      challengeId: challenge.id,
      message: `A 6-digit code was sent to ${maskEmail(user.email)}. Enter it to complete 2FA enrollment.`,
    }),
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}
