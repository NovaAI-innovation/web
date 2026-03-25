import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseToken, findClientById, type StoredClient } from "@/lib/client-store";
import { failure } from "@/lib/api";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export type AuthResult =
  | { ok: true; client: StoredClient }
  | { ok: false; response: NextResponse };

/**
 * Validates the portalToken cookie server-side.
 * Use this in every /api/client-portal/* route that requires authentication.
 *
 * @example
 * const auth = await requirePortalAuth();
 * if (!auth.ok) return auth.response;
 * const { client } = auth;
 */
export async function requirePortalAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("portalToken")?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Not authenticated"),
        { status: 401 },
      ),
    };
  }

  const parsed = parseToken(token);
  if (!parsed) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Invalid token"),
        { status: 401 },
      ),
    };
  }

  if (Date.now() - parsed.timestamp > SESSION_DURATION_MS) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Session expired"),
        { status: 401 },
      ),
    };
  }

  const client = await findClientById(parsed.clientId);
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Account not found"),
        { status: 401 },
      ),
    };
  }

  return { ok: true, client };
}
