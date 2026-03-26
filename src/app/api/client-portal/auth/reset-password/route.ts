/**
 * POST /api/client-portal/auth/reset-password
 * @deprecated Use POST /api/auth/reset-password instead.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(validated.data.token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid or expired reset link"), { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Reset link has expired"), { status: 400 });
  }

  const newHash = await hashPassword(validated.data.newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: newHash, legacySalt: null, failedLoginCount: 0, accountLockedAt: null, accountLockedUntil: null } }),
  ]);

  logEvent({ level: "info", message: "Password reset complete", requestId, route: "/api/client-portal/auth/reset-password", status: 200 });
  return NextResponse.json(success({ message: "Password has been reset. You can now sign in." }));
}
