import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getPortalMessages, addPortalMessage } from "@/lib/portal-messages";
import { findClientById } from "@/lib/client-store";
import { success, failure } from "@/lib/api";

type Params = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { clientId } = await params;
  const [messages, client] = await Promise.all([
    getPortalMessages(clientId),
    findClientById(clientId),
  ]);

  return NextResponse.json(success({ messages, client: client ? { id: client.id, name: client.name, email: client.email } : null }));
}

const replySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { clientId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const message = await addPortalMessage({
    clientId,
    author: "pm",
    body: parsed.data.body,
  });

  return NextResponse.json(success(message), { status: 201 });
}
