/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 *
 * Validates the reset token and updates the user's password with bcrypt.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword, logAuditEvent } from "@/lib/auth";
import { getRequestId } from "@/lib/request-id";
import { logEvent } from "@/lib/observability";

const schema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const { token, newPassword } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid or expired reset link"),
      { status: 400 },
    );
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "This reset link has expired. Please request a new one."),
      { status: 400 },
    );
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: newHash,
        legacySalt: null,
        failedLoginCount: 0,
        accountLockedAt: null,
        accountLockedUntil: null,
      },
    }),
  ]);

  void logAuditEvent({ userId: resetToken.userId, action: "auth.password_reset_complete", ipAddress: ip });
  logEvent({ level: "info", message: "Password reset complete", requestId, route: "/api/auth/reset-password", status: 200 });

  return NextResponse.json(success({ message: "Password updated successfully. You can now sign in." }));
}
