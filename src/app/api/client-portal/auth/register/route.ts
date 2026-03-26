/**
 * POST /api/client-portal/auth/register
 *
 * @deprecated Use POST /api/auth/register instead.
 * Delegates to the new register handler for backward compatibility.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword, logAuditEvent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { sendEmailConfirmation } from "@/lib/email";
import { initializePortalForClient } from "@/lib/portal-init";
import { getRequestId } from "@/lib/request-id";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(128),
  mailingListOptIn: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { allowed, retryAfterSeconds } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many registrations. Try again in ${retryAfterSeconds}s.`),
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON body"), { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const { name, email, phone, password, mailingListOptIn } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "An account with this email already exists"),
      { status: 409 },
    );
  }

  const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
  if (!clientRole) {
    logEvent({ level: "error", message: "client role not found", requestId, route: "/api/client-portal/auth/register", status: 500 });
    return NextResponse.json(failure("INTERNAL_ERROR", "Registration failed"), { status: 500 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      roleId: clientRole.id,
      mailingListOptIn: mailingListOptIn ?? false,
    },
  });

  await prisma.notificationPreference.create({
    data: { userId: user.id, emailMessages: true, emailMilestones: true, emailBudget: false },
  });

  await initializePortalForClient({ id: user.id, name: user.name });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await prisma.emailConfirmation.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await sendEmailConfirmation({ to: user.email, name: user.name, token: rawToken, requestId }).catch(() => null);

  void logAuditEvent({ userId: user.id, action: "auth.register", ipAddress: ip });

  return NextResponse.json(
    success({ id: user.id, name: user.name, email: user.email, emailVerificationRequired: true }),
    { status: 201 },
  );
}
