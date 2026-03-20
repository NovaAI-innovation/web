import { NextResponse } from "next/server";
import { z } from "zod";
import { failure, success } from "@/lib/api";
import { sendAlert } from "@/lib/alerts";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";

const clientErrorSchema = z.object({
  type: z.enum(["error", "unhandledrejection"]),
  message: z.string().trim().min(1).max(5000),
  stack: z.string().max(12000).optional(),
  pathname: z.string().max(2048),
  userAgent: z.string().max(2048),
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/monitoring/error";

  const throttle = rateLimit(`monitoring:error:${requestId}`, 120, 60 * 60 * 1000);
  if (!throttle.allowed) {
    return NextResponse.json(failure("RATE_LIMITED", "Too many monitoring events"), {
      status: 429,
      headers: { "x-request-id": requestId },
    });
  }

  try {
    const body = await request.json();
    const parsed = clientErrorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Invalid monitoring payload"),
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const payload = parsed.data;

    logEvent({
      level: "error",
      message: "Client runtime error captured",
      requestId,
      route,
      status: 200,
      durationMs: Date.now() - startedAt,
      errorCode: "CLIENT_RUNTIME_ERROR",
      context: {
        type: payload.type,
        path: payload.pathname,
        message: payload.message,
        stack: payload.stack?.slice(0, 1500),
        userAgent: payload.userAgent,
      },
    });

    if (payload.type === "error") {
      await sendAlert({
        title: "Client Runtime Error",
        severity: "medium",
        requestId,
        route: payload.pathname,
        message: payload.message,
        context: {
          type: payload.type,
        },
      });
    }

    return NextResponse.json(success({ accepted: true }), {
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    logEvent({
      level: "error",
      message: "Monitoring intake failed",
      requestId,
      route,
      status: 500,
      durationMs: Date.now() - startedAt,
      errorCode: "INTERNAL_ERROR",
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Monitoring intake failed"),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
