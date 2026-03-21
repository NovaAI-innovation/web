import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { parseToken, findClientById, changeClientPassword } from "@/lib/client-store";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const route = "/api/client-portal/auth/password";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request.headers);
  const cookieStore = await cookies();
  const token = cookieStore.get("portalToken")?.value;

  if (!token) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not authenticated"), { status: 401 });
  }

  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid token"), { status: 401 });
  }

  const client = await findClientById(parsed.clientId);
  if (!client) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account not found"), { status: 401 });
  }

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

  const result = await changeClientPassword(client.id, currentPassword, newPassword);

  if (!result.success) {
    logEvent({
      level: "error",
      message: "Password change failed: wrong current password",
      requestId,
      route,
      status: 400,
      durationMs: Date.now() - start,
      context: { clientId: client.id },
    });
    return NextResponse.json(
      failure("VALIDATION_ERROR", result.error ?? "Password change failed"),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  logEvent({
    level: "info",
    message: "Password changed successfully",
    requestId,
    route,
    status: 200,
    durationMs: Date.now() - start,
    context: { clientId: client.id },
  });

  return NextResponse.json(
    success({ message: "Password changed successfully" }),
    { headers: { "x-request-id": requestId } },
  );
}
