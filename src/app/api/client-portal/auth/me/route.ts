import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { success, failure } from "@/lib/api";
import { parseToken, findClientById } from "@/lib/client-store";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portalToken")?.value;

  if (!token) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Not authenticated"),
      { status: 401 },
    );
  }

  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid token"),
      { status: 401 },
    );
  }

  // Check token expiry (8 hours)
  const eightHoursMs = 8 * 60 * 60 * 1000;
  if (Date.now() - parsed.timestamp > eightHoursMs) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Session expired"),
      { status: 401 },
    );
  }

  const client = await findClientById(parsed.clientId);
  if (!client) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Account not found"),
      { status: 401 },
    );
  }

  return NextResponse.json(
    success({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
    }),
  );
}
