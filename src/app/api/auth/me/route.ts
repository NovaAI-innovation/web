/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user. Used by layouts to verify
 * session validity on client-side navigation.
 */
import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { user } = auth;
  return NextResponse.json(
    success({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      twoFactorEnabled: user.twoFactorEnabled,
      mailingListOptIn: user.mailingListOptIn,
    }),
  );
}
