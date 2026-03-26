/**
 * POST /api/client-portal/auth/logout
 * Delegates to the unified logout handler.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { destroySession, clearSessionCookies } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (token) await destroySession(token);

  const response = NextResponse.json(success({ message: "Logged out" }));
  clearSessionCookies(response);
  return response;
}
