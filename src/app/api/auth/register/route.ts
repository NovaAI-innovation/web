/**
 * POST /api/auth/register
 *
 * Self-service client registration. Creates account in pending_verification
 * state and sends an email confirmation link.
 *
 * Does NOT issue a session cookie — the user must verify their email first.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword, logAuditEvent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { sendEmailConfirmation, sendMailingListWelcome } from "@/lib/email";
import { initializePortalForClient } from "@/lib/portal-init";
import { getRequestId } from "@/lib/request-id";

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number is too short").max(20, "Phone number is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters"),
  mailingListOptIn: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limit: 5 registrations per hour per IP
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

  const normalizedEmail = email.toLowerCase();
  const [existing, clientRole] = await Promise.all([
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { name: "client" },
      select: { id: true },
    }),
  ]);

  if (existing) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "An account with this email already exists"),
      { status: 409 },
    );
  }

  if (!clientRole) {
    logEvent({ level: "error", message: "client role not found in DB", requestId, route: "/api/auth/register", status: 500 });
    return NextResponse.json(failure("INTERNAL_ERROR", "Registration failed"), { status: 500 });
  }

  const passwordHash = await hashPassword(password);

  // Create user — emailVerifiedAt is null until confirmed
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone,
      passwordHash,
      roleId: clientRole.id,
      mailingListOptIn: mailingListOptIn ?? false,
    },
  });

  // Seed default notification preferences
  await prisma.notificationPreference.create({
    data: {
      userId: user.id,
      emailMessages: true,
      emailMilestones: true,
      emailBudget: false,
    },
  });

  // Seed demo portal data (projects, invoices, welcome messages)
  await initializePortalForClient({ id: user.id, name: user.name });

  // Create email confirmation token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.emailConfirmation.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  // Send confirmation email
  try {
    await sendEmailConfirmation({ to: user.email, name: user.name, token: rawToken, requestId });
  } catch (err) {
    logEvent({ level: "error", message: "Failed to send confirmation email", requestId, route: "/api/auth/register", context: { error: String(err) } });
    // Don't fail registration — user can request resend
  }

  // Send mailing list welcome if opted in
  if (mailingListOptIn) {
    void sendMailingListWelcome({ to: user.email, name: user.name }).catch(() => null);
  }

  void logAuditEvent({ userId: user.id, action: "auth.register", ipAddress: ip });
  logEvent({ level: "info", message: "Client registered", requestId, route: "/api/auth/register", status: 201, context: { ip } });

  return NextResponse.json(
    success({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerificationRequired: true,
    }),
    { status: 201 },
  );
}
