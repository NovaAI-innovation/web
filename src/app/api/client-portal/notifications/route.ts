import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import {
  parseToken,
  findClientById,
  getNotificationPrefs,
  updateNotificationPrefs,
} from "@/lib/client-store";

const prefsSchema = z.object({
  email: z.boolean().optional(),
  messages: z.boolean().optional(),
  milestones: z.boolean().optional(),
  budget: z.boolean().optional(),
});

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portalToken")?.value;
  if (!token) return null;

  const parsed = parseToken(token);
  if (!parsed) return null;

  return findClientById(parsed.clientId);
}

export async function GET() {
  const client = await getAuthenticatedClient();
  if (!client) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not authenticated"), { status: 401 });
  }

  const prefs = await getNotificationPrefs(client.id);
  return NextResponse.json(success(prefs));
}

export async function PUT(request: Request) {
  const client = await getAuthenticatedClient();
  if (!client) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not authenticated"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = prefsSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid preferences"),
      { status: 400 },
    );
  }

  const updated = await updateNotificationPrefs(client.id, validated.data);
  return NextResponse.json(success(updated));
}
