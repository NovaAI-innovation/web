import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getProjectById, updateProject, deleteProject } from "@/lib/project-store";
import { success, failure } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.string().optional(),
  status: z.enum(["active", "planning", "completed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  budget: z.object({
    allocated: z.number().min(0),
    spent: z.number().min(0),
  }).optional(),
  schedule: z.object({
    baselineEnd: z.string(),
    currentEnd: z.string(),
    daysVariance: z.number(),
  }).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Project not found"), { status: 404 });
  }
  return NextResponse.json(success(project));
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const project = await updateProject(id, parsed.data);
  if (!project) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Project not found"), { status: 404 });
  }
  return NextResponse.json(success(project));
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deleteProject(id);
  if (!deleted) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Project not found"), { status: 404 });
  }
  return NextResponse.json(success({ deleted: true }));
}
