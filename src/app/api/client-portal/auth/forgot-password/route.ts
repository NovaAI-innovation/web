/**
 * POST /api/client-portal/auth/forgot-password
 * @deprecated Use POST /api/auth/forgot-password instead.
 * Delegates to the unified implementation.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { success, failure } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { sendPasswordResetEmail } from "@/lib/email";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
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
    return NextResponse.json(failure("VALIDATION_ERROR", "Please enter a valid email address"), { status: 400 });
  }

  const email = validated.data.email.toLowerCase();
  const emailKey = createHash("sha256").update(email).digest("hex").slice(0, 16);
  const { allowed } = rateLimit(`forgot-password:${emailKey}`, 3, 60 * 60 * 1000);

  const user = allowed ? await prisma.user.findUnique({ where: { email } }) : null;

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken: rawToken, requestId }).catch(() => null);

    if (process.env.NODE_ENV === "development") {
      logEvent({ level: "info", message: `[DEV] Reset link: /client-portal/reset-password?token=${rawToken}`, requestId, route: "/api/client-portal/auth/forgot-password" });
    }
  }

  return NextResponse.json(
    success({ message: "If an account with that email exists, we've sent password reset instructions." }),
  );
}
