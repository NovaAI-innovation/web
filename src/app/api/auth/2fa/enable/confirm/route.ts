/**
 * POST /api/auth/2fa/enable/confirm
 * Body: { challengeId, otp }
 *
 * Verifies the enrollment OTP and activates 2FA on the account.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAuth, logAuditEvent } from "@/lib/auth";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  otp: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { user } = auth;

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

  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: parsed.data.challengeId },
  });

  if (!challenge || challenge.userId !== user.id || challenge.completedAt) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid or expired challenge"), { status: 400 });
  }

  if (challenge.expiresAt < new Date() || challenge.attemptCount >= 3) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Code has expired or maximum attempts exceeded. Please try again."),
      { status: 400 },
    );
  }

  const otpHash = createHash("sha256").update(parsed.data.otp).digest("hex");
  if (otpHash !== challenge.otpHash) {
    await prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } },
    });
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid code"), { status: 401 });
  }

  await prisma.$transaction([
    prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { completedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } }),
  ]);

  void logAuditEvent({ userId: user.id, action: "auth.2fa_enable", ipAddress: ip });
  logEvent({ level: "info", message: "2FA enabled", requestId, route: "/api/auth/2fa/enable/confirm", status: 200 });

  return NextResponse.json(success({ message: "Two-factor authentication has been enabled." }));
}
