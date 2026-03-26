/**
 * GET /api/auth/verify-email?token=<raw-token>
 *
 * Confirms an email address. On success, marks the user as verified and
 * redirects to /login with a success param.
 */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/auth";
import { logEvent } from "@/lib/observability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=error&reason=missing_token", siteUrl));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const confirmation = await prisma.emailConfirmation.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!confirmation) {
    return NextResponse.redirect(new URL("/login?verified=error&reason=invalid_token", siteUrl));
  }

  // Already used
  if (confirmation.usedAt) {
    return NextResponse.redirect(new URL("/login?verified=already", siteUrl));
  }

  // Expired
  if (confirmation.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?verified=error&reason=expired", siteUrl));
  }

  // Mark token used and user verified in a transaction
  await prisma.$transaction([
    prisma.emailConfirmation.update({
      where: { id: confirmation.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: confirmation.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  void logAuditEvent({ userId: confirmation.userId, action: "auth.email_verify", ipAddress: ip });
  logEvent({ level: "info", message: "Email verified", requestId: "verify", route: "/api/auth/verify-email", status: 302, context: { userId: confirmation.userId } });

  return NextResponse.redirect(new URL("/login?verified=true", siteUrl));
}
