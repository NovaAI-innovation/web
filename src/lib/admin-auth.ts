import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { failure } from "@/lib/api";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Validates the adminToken cookie server-side.
 * Use at the top of every /api/admin/* route that requires authentication.
 *
 * @example
 * const auth = await requireAdminAuth();
 * if (!auth.ok) return auth.response;
 */
export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("adminToken")?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        failure("VALIDATION_ERROR", "Not authenticated"),
        { status: 401 },
      ),
    };
  }

  const parsed = parseAdminToken(token);
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

  return { ok: true };
}

export function verifyAdminPassword(password: string): boolean {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  // Constant-time comparison via hash
  const inputHash = createHash("sha256").update(password).digest("hex");
  const configuredHash = createHash("sha256").update(configured).digest("hex");
  return inputHash === configuredHash;
}

export function generateAdminToken(): string {
  const payload = `admin:${Date.now()}:${randomBytes(16).toString("hex")}`;
  return Buffer.from(payload).toString("base64url");
}

export function parseAdminToken(token: string): { timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts[0] !== "admin") return null;
    const timestamp = Number(parts[1]);
    if (isNaN(timestamp)) return null;
    return { timestamp };
  } catch {
    return null;
  }
}
