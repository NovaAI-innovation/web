import { sendAlert } from "@/lib/alerts";
import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api";
import { contactSubmissionSchema } from "@/lib/contact";
import { sendLeadNotification } from "@/lib/email";
import { saveLead } from "@/lib/lead-store";
import { logEvent } from "@/lib/observability";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";
import { sendTrace } from "@/lib/tracing";

const LIMIT_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/contact/submit";
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const throttle = rateLimit(`contact-submit:${ip}`, LIMIT_PER_HOUR, HOUR_MS);

  if (!throttle.allowed) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Contact submit rate limited",
      requestId,
      route,
      status: 429,
      errorCode: "RATE_LIMITED",
      durationMs: endedAt - startedAt,
    });
    await sendTrace({
      name: "contact.submit",
      requestId,
      route,
      startMs: startedAt,
      endMs: endedAt,
      status: 429,
      attributes: { event: "rate_limited" },
    });
    return NextResponse.json(
      failure("RATE_LIMITED", "Too many requests, try again later."),
      {
        status: 429,
        headers: {
          "x-request-id": requestId,
          "retry-after": String(throttle.retryAfterSeconds),
        },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid JSON payload."),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  const validated = contactSubmissionSchema.safeParse(payload);
  if (!validated.success) {
    const endedAt = Date.now();
    await sendTrace({
      name: "contact.submit",
      requestId,
      route,
      startMs: startedAt,
      endMs: endedAt,
      status: 422,
      attributes: { event: "validation_error" },
    });
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Request validation failed.", {
        issues: validated.error.issues,
      }),
      { status: 422, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const leadId = await saveLead(validated.data);
    let emailStatus: "sent" | "skipped" | "failed" = "skipped";

    try {
      emailStatus = await sendLeadNotification({
        leadId,
        lead: validated.data,
        requestId,
      });
    } catch (error) {
      emailStatus = "failed";
      await sendAlert({
        title: "Lead notification email failed",
        severity: "high",
        requestId,
        route,
        message:
          error instanceof Error ? error.message : "Unknown email failure",
        context: { leadId, retryRequired: true },
      });
      logEvent({
        level: "error",
        message: "Lead notification email failed",
        requestId,
        route,
        status: 201,
        errorCode: "DEPENDENCY_FAILURE",
        durationMs: Date.now() - startedAt,
        context: {
          leadId,
          retryRequired: true,
        },
      });
    }

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Lead created",
      requestId,
      route,
      status: 201,
      durationMs: endedAt - startedAt,
      context: { event: "lead_created", leadId, emailStatus },
    });
    await sendTrace({
      name: "contact.submit",
      requestId,
      route,
      startMs: startedAt,
      endMs: endedAt,
      status: 201,
      attributes: { event: "lead_created", emailStatus },
    });

    return NextResponse.json(
      success({
        leadId,
        emailStatus,
      }),
      { status: 201, headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Lead storage failure",
      requestId,
      route,
      status: 500,
      errorCode: "DEPENDENCY_FAILURE",
      durationMs: endedAt - startedAt,
      context: {
        detail: error instanceof Error ? error.message : "unknown",
      },
    });
    await sendAlert({
      title: "Lead storage failure",
      severity: "critical",
      requestId,
      route,
      message: error instanceof Error ? error.message : "unknown",
    });
    await sendTrace({
      name: "contact.submit",
      requestId,
      route,
      startMs: startedAt,
      endMs: endedAt,
      status: 500,
      attributes: { event: "storage_failure" },
    });

    return NextResponse.json(
      failure("DEPENDENCY_FAILURE", "Unable to save lead at this time."),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
