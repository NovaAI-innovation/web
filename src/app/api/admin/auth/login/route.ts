import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { verifyAdminPassword, generateAdminToken } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfterSeconds } = rateLimit(`admin-login:${ip}`, 5, 60 * 60 * 1000);

  if (!allowed) {
    logEvent({
      level: "error",
      message: "Admin login rate limited",
      requestId,
      route: "/api/admin/auth/login",
      status: 429,
      errorCode: "RATE_LIMITED",
      context: { ip },
    });
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many attempts. Try again in ${retryAfterSeconds}s.`),
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON body"), { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    logEvent({
      level: "error",
      message: "Failed admin login attempt",
      requestId,
      route: "/api/admin/auth/login",
      status: 401,
      context: { ip },
    });
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid password"), { status: 401 });
  }

  const token = generateAdminToken();
  const response = NextResponse.json(success({ ok: true }));
  response.cookies.set("adminToken", token, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    httpOnly: true,
  });

  logEvent({
    level: "info",
    message: "Admin login successful",
    requestId,
    route: "/api/admin/auth/login",
    status: 200,
    context: { ip },
  });

  return response;
}
