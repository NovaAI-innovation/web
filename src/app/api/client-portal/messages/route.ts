import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addPortalMessage,
  getPortalMessages,
  getUnreadCountForClient,
} from "@/lib/portal-messages";
import { failure, success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";

const createMessageSchema = z.object({
  body: z.string().trim().min(2).max(2000),
});

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/messages";

  try {
    const messages = await getPortalMessages();
    const unreadCount = getUnreadCountForClient(messages);

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal messages retrieved",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { count: messages.length, unreadCount },
    });

    return NextResponse.json(
      success({
        messages,
        unreadCount,
      }),
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Failed to retrieve portal messages",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to retrieve messages"),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/messages";

  const throttle = rateLimit(`portal-message:${requestId}`, 30, 60 * 60 * 1000);
  if (!throttle.allowed) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Portal message rate limited",
      requestId,
      route,
      status: 429,
      errorCode: "RATE_LIMITED",
      durationMs: endedAt - startedAt,
    });

    return NextResponse.json(
      failure("RATE_LIMITED", "Too many messages. Try again shortly."),
      { status: 429, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const json = await request.json();
    const parsed = createMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Message body must be between 2 and 2000 characters."),
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const message = await addPortalMessage({
      author: "client",
      body: parsed.data.body,
    });

    // Basic "real-time" experience: immediate PM acknowledgement event.
    await addPortalMessage({
      author: "pm",
      body: "Received. Your project manager will review and respond with details shortly.",
    });

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal message created",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { messageId: message.id },
    });

    return NextResponse.json(
      success({ message }),
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Failed to create portal message",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to send message"),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
