import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { createProject, getAllProjects, getProjectListSummary } from "@/lib/project-store";
import { success, failure } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().optional(),
  status: z.enum(["active", "planning", "completed"]).default("planning"),
  progress: z.number().min(0).max(100).default(0),
  budget: z.object({
    allocated: z.number().min(0),
    spent: z.number().min(0).default(0),
  }),
  schedule: z.object({
    baselineEnd: z.string(),
    currentEnd: z.string(),
    daysVariance: z.number().default(0),
  }),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean().default(false),
    dueDate: z.string(),
  })).default([]),
  activity: z.array(z.any()).default([]),
});

export async function GET(request?: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;
  const summary = request ? new URL(request.url).searchParams.get("summary") : null;
  const projects = summary === "1" ? await getProjectListSummary() : await getAllProjects();
  return NextResponse.json(success(projects), {
    headers: {
      "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const project = await createProject(parsed.data);
  return NextResponse.json(success(project), { status: 201 });
}
