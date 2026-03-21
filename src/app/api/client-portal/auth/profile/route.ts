import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { parseToken, findClientById, updateClient } from "@/lib/client-store";

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
});

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("portalToken")?.value;

  if (!token) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not authenticated"), { status: 401 });
  }

  const parsed = parseToken(token);
  if (!parsed) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid token"), { status: 401 });
  }

  const client = await findClientById(parsed.clientId);
  if (!client) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Account not found"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = profileSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const updated = await updateClient(client.id, validated.data);
  if (!updated) {
    return NextResponse.json(failure("INTERNAL_ERROR", "Update failed"), { status: 500 });
  }

  return NextResponse.json(
    success({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
    }),
  );
}
