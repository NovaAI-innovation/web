/**
 * POST /api/auth/resend-verification
 * Body: { email }
 *
 * Re-sends an email confirmation link. Rate-limited to 3 per hour per email.
 * Always returns 200 to prevent email enumeration.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { sendEmailConfirmation } from "@/lib/email";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON body"), { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid email"), { status: 400 });
  }

  // Rate limit per email
  const emailKey = createHash("sha256").update(parsed.data.email.toLowerCase()).digest("hex").slice(0, 16);
  const { allowed } = rateLimit(`resend-verify:${emailKey}`, 3, 60 * 60 * 1000);
  if (!allowed) {
    // Return 200 to prevent enumeration, but don't send
    return NextResponse.json(success({ message: "If an unverified account exists, we've resent the confirmation email." }));
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  if (user && !user.emailVerifiedAt) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.emailConfirmation.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendEmailConfirmation({ to: user.email, name: user.name, token: rawToken, requestId }).catch(() => null);
    logEvent({ level: "info", message: "Resent verification email", requestId, route: "/api/auth/resend-verification", status: 200 });
  }

  return NextResponse.json(success({ message: "If an unverified account exists, we've resent the confirmation email." }));
}
