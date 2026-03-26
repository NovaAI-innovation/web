/**
 * Admin portal auth guard — thin wrapper around requireRole('admin').
 *
 * Usage:
 *   const auth = await requireAdminAuth();
 *   if (!auth.ok) return auth.response;
 *   // auth.user is available for audit logging
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export type AdminAuthResult =
  | { ok: true; user: { id: string; name: string; email: string } }
  | { ok: false; response: NextResponse };

export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const auth = await requireRole("admin");

  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  const { user } = auth;
  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  };
}
