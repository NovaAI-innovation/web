/**
 * Client portal auth guard — thin wrapper around requireRole().
 *
 * Returns a StoredClient-compatible shape so existing portal routes
 * don't need to be changed:
 *
 *   const auth = await requirePortalAuth();
 *   if (!auth.ok) return auth.response;
 *   const { client } = auth;  // id, name, email, phone
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export type PortalClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type AuthResult =
  | { ok: true; client: PortalClient }
  | { ok: false; response: NextResponse };

export async function requirePortalAuth(): Promise<AuthResult> {
  const auth = await requireRole("client");

  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  const { user } = auth;

  return {
    ok: true,
    client: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
    },
  };
}

/**
 * @deprecated Use requirePortalAuth() instead.
 * Kept for backward compatibility; delegates to the new session system.
 */
export async function requirePortalAuthLegacy(): Promise<AuthResult> {
  return requirePortalAuth();
}

// Re-export StoredClient alias for existing imports that reference it
export type StoredClient = PortalClient;
