import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { requirePortalAuth } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = passwordSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = validated.data;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "New password must be different from current password"),
      { status: 400 },
    );
  }

  const dbUser = await prisma.user.findUnique({ where: { id: auth.client.id } });
  if (!dbUser) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account not found"), { status: 404 });
  }

  const { valid } = await verifyPassword(currentPassword, dbUser.passwordHash, dbUser.legacySalt);
  if (!valid) {
    logEvent({ level: "error", message: "Password change failed: wrong current password", requestId, route: "/api/client-portal/auth/password", status: 400, context: { userId: dbUser.id } });
    return NextResponse.json(failure("VALIDATION_ERROR", "Current password is incorrect"), { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { passwordHash: newHash, legacySalt: null },
  });

  logEvent({ level: "info", message: "Password changed", requestId, route: "/api/client-portal/auth/password", status: 200 });
  return NextResponse.json(success({ message: "Password changed successfully" }));
}
