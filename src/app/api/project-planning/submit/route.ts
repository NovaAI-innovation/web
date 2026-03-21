import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { savePlanningRequest } from "@/lib/planning-store";
import { rateLimit } from "@/lib/rate-limit";

const planningSchema = z.object({
  scope: z.string().min(1, "Please select a project scope"),
  timeline: z.string().min(1, "Please select a timeline"),
  budget: z.string().min(1, "Please select a budget range"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(7, "Please enter a valid phone number"),
});

const route = "/api/project-planning/submit";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request.headers);

  const rateLimitResult = rateLimit(`planning:${requestId}`, 5, 3600000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", "Too many submissions. Please try again later."),
      { status: 429, headers: { "x-request-id": requestId } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = planningSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const id = await savePlanningRequest(validated.data);

    logEvent({
      level: "info",
      message: "Project planning request submitted",
      requestId,
      route,
      status: 200,
      durationMs: Date.now() - start,
      context: { planningId: id, scope: validated.data.scope },
    });

    return NextResponse.json(
      success({ id, message: "Project brief submitted successfully" }),
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    logEvent({
      level: "error",
      message: "Failed to save planning request",
      requestId,
      route,
      status: 500,
      durationMs: Date.now() - start,
      context: { error: error instanceof Error ? error.message : "Unknown" },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to submit. Please try again."),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
