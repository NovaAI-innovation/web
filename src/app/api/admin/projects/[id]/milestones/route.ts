import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { addMilestone } from "@/lib/project-store";
import { success, failure } from "@/lib/api";

const schema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  completed: z.boolean().default(false),
  weight: z.number().optional(),
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

  const milestone = await addMilestone(id, parsed.data);
  if (!milestone) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Project not found"), { status: 404 });
  }
  return NextResponse.json(success(milestone), { status: 201 });
}
