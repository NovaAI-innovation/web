/**
 * POST /api/auth/2fa/disable
 * Body: { password }
 *
 * Disables 2FA after verifying the current password.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAuth, verifyPassword, logAuditEvent } from "@/lib/auth";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
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

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account not found"), { status: 404 });
  }

  const { valid } = await verifyPassword(parsed.data.password, dbUser.passwordHash, dbUser.legacySalt);
  if (!valid) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Incorrect password"), { status: 401 });
  }

  if (!dbUser.twoFactorEnabled) {
    return NextResponse.json(failure("VALIDATION_ERROR", "2FA is not currently enabled"), { status: 409 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } });

  void logAuditEvent({ userId: user.id, action: "auth.2fa_disable", ipAddress: ip });
  logEvent({ level: "info", message: "2FA disabled", requestId, route: "/api/auth/2fa/disable", status: 200 });

  return NextResponse.json(success({ message: "Two-factor authentication has been disabled." }));
}
