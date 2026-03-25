import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { createResetToken, findClientByEmail } from "@/lib/client-store";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const route = "/api/client-portal/auth/forgot-password";

export async function POST(request: Request) {
  const start = Date.now();
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
      failure("VALIDATION_ERROR", "Please enter a valid email address"),
      { status: 400 },
    );
  }

  const token = await createResetToken(validated.data.email);

  // Always return success to prevent email enumeration
  logEvent({
    level: "info",
    message: token ? "Password reset token created" : "Password reset requested for unknown email",
    requestId,
    route,
    status: 200,
    durationMs: Date.now() - start,
    context: { emailProvided: true, tokenCreated: !!token },
  });

  if (token) {
    const client = await findClientByEmail(validated.data.email);
    if (client) {
      const emailResult = await sendPasswordResetEmail({
        to: client.email,
        resetToken: token,
        requestId,
      });
      logEvent({
        level: "info",
        message: `Password reset email ${emailResult}`,
        requestId,
        route,
        context: { emailResult },
      });
    }

    // In development, also log the link for easy testing without an email provider
    if (process.env.NODE_ENV === "development") {
      logEvent({
        level: "info",
        message: `[DEV] Reset link: /client-portal/reset-password?token=${token}`,
        requestId,
        route,
      });
    }
  }

  return NextResponse.json(
    success({
      message: "If an account with that email exists, we've sent password reset instructions.",
      // Include token in dev mode so the flow is testable
      ...(process.env.NODE_ENV === "development" ? { resetToken: token } : {}),
    }),
    { headers: { "x-request-id": requestId } },
  );
}
