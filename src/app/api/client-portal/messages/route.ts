import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addPortalMessage,
  getPortalMessages,
  getUnreadCountForClient,
} from "@/lib/portal-messages";
import { generatePortalAgentReply } from "@/lib/portal-agent";
import { addAgentMemoryEntry } from "@/lib/portal-agent-memory";
import { failure, success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { requirePortalAuth } from "@/lib/portal-auth";

const attachmentSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  size: z.number().positive(),
});

const createMessageSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  attachment: attachmentSchema.optional(),
});

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/messages";

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  try {
    const messages = await getPortalMessages(auth.client.id);
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

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  const throttle = rateLimit(`portal-message:${auth.client.id}`, 30, 60 * 60 * 1000);
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
      clientId: auth.client.id,
      author: "client",
      body: parsed.data.body,
      ...(parsed.data.attachment ? { attachment: parsed.data.attachment } : {}),
    });

    // Build 1-time attachment context if present
    let attachmentContext: { filename: string; text: string } | null = null;
    if (parsed.data.attachment) {
      const uploadsDir = path.join(process.cwd(), '.data', 'uploads');
      const filePath = path.join(uploadsDir, parsed.data.attachment.filename);
      try {
        if (parsed.data.attachment.filename.match(/\.(txt|md|csv)$/i)) {
          const text = fs.readFileSync(filePath, 'utf-8');
          attachmentContext = { filename: parsed.data.attachment.originalName, text };
        } else {
          const sizeKb = Math.round(parsed.data.attachment.size / 1024);
          attachmentContext = {
            filename: parsed.data.attachment.originalName,
            text: `[Binary file: ${parsed.data.attachment.originalName}, ${sizeKb} KB — content not extractable in current version]`,
          };
        }
      } catch { /* file not readable */ }
    }

    const agent = await generatePortalAgentReply({
      clientId: auth.client.id,
      clientName: auth.client.name,
      query: parsed.data.body,
      attachmentContext,
    });

    await addPortalMessage({
      clientId: auth.client.id,
      author: "agent",
      body: agent.body,
      reasoning: agent.reasoning,
    });

    await addAgentMemoryEntry({
      clientId: auth.client.id,
      query: parsed.data.body,
      responseSummary: agent.memorySummary,
      artifactRefs: agent.artifactRefs,
    });

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal message created with agent response",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { messageId: message.id, clientId: auth.client.id },
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
