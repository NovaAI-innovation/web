import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { updateMilestone, deleteMilestone } from "@/lib/project-store";
import { success, failure } from "@/lib/api";

const schema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().optional(),
  weight: z.number().optional(),
});

type Params = { params: Promise<{ id: string; mid: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id, mid } = await params;

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

  const milestone = await updateMilestone(id, mid, parsed.data);
  if (!milestone) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not found"), { status: 404 });
  }
  return NextResponse.json(success(milestone));
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id, mid } = await params;
  const deleted = await deleteMilestone(id, mid);
  if (!deleted) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Not found"), { status: 404 });
  }
  return NextResponse.json(success({ deleted: true }));
}
