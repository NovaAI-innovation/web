import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { addActivity } from "@/lib/project-store";
import { success, failure } from "@/lib/api";

const schema = z.object({
  message: z.string().min(1),
  type: z.enum(["milestone", "document", "note", "budget"]).default("note"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const activity = await addActivity(id, parsed.data);
  if (!activity) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Project not found"), { status: 404 });
  }
  return NextResponse.json(success(activity), { status: 201 });
}
