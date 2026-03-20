import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api";
import { markPortalMessagesReadForClient } from "@/lib/portal-messages";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/messages/read";

  try {
    const updated = await markPortalMessagesReadForClient();

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal messages marked read",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { updated },
    });

    return NextResponse.json(
      success({ updated }),
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Failed to mark portal messages read",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to mark messages as read"),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
