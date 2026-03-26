/**
 * POST /api/auth/logout
 *
 * Destroys the server-side session and clears all auth cookies.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { destroySession, clearSessionCookies } from "@/lib/auth";
import { logEvent } from "@/lib/observability";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;

  if (token) {
    await destroySession(token);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  logEvent({ level: "info", message: "User logged out", requestId: "logout", route: "/api/auth/logout", status: 200, context: { ip } });

  const response = NextResponse.json(success({ message: "Logged out" }));
  clearSessionCookies(response);
  return response;
}
