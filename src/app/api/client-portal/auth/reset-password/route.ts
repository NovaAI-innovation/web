import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { resetPasswordWithToken } from "@/lib/client-store";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const schema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const route = "/api/client-portal/auth/reset-password";

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
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const result = await resetPasswordWithToken(validated.data.token, validated.data.newPassword);

  if (!result.success) {
    logEvent({
      level: "error",
      message: "Password reset failed",
      requestId,
      route,
      status: 400,
      durationMs: Date.now() - start,
      context: { reason: result.error },
    });
    return NextResponse.json(
      failure("VALIDATION_ERROR", result.error ?? "Reset failed"),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  logEvent({
    level: "info",
    message: "Password reset successful",
    requestId,
    route,
    status: 200,
    durationMs: Date.now() - start,
  });

  return NextResponse.json(
    success({ message: "Password has been reset. You can now sign in." }),
    { headers: { "x-request-id": requestId } },
  );
}
