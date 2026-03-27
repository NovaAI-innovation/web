import { readFile } from "node:fs/promises";
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
import { requirePortalAuth } from "@/lib/portal-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";

const attachmentSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  size: z.number().positive(),
});

const createMessageSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  attachment: attachmentSchema.optional(),
});

async function buildAttachmentContext(
  attachment: z.infer<typeof attachmentSchema> | undefined,
): Promise<{ filename: string; text: string } | null> {
  if (!attachment) return null;

  if (!attachment.filename.match(/\.(txt|md|csv)$/i)) {
    const sizeKb = Math.round(attachment.size / 1024);
    return {
      filename: attachment.originalName,
      text: `[Binary file: ${attachment.originalName}, ${sizeKb} KB - content not extractable in current version]`,
    };
  }

  const uploadsDir = path.join(process.cwd(), ".data", "uploads");
  const filePath = path.join(uploadsDir, attachment.filename);

  try {
    const text = await readFile(filePath, "utf-8");
    return { filename: attachment.originalName, text };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/messages";

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  try {
    const readStartedAt = Date.now();
    const messages = await getPortalMessages(auth.client.id);
    const readDurationMs = Date.now() - readStartedAt;

    const aggregateStartedAt = Date.now();
    const unreadCount = getUnreadCountForClient(messages);
    const aggregateDurationMs = Date.now() - aggregateStartedAt;

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal messages retrieved",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: {
        count: messages.length,
        unreadCount,
        timings: {
          readDurationMs,
          aggregateDurationMs,
        },
      },
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
    const parseStartedAt = Date.now();
    const json = await request.json();
    const parsed = createMessageSchema.safeParse(json);
    const parseDurationMs = Date.now() - parseStartedAt;

    if (!parsed.success) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Message body must be between 2 and 2000 characters."),
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const persistClientMessageStartedAt = Date.now();
    const message = await addPortalMessage({
      clientId: auth.client.id,
      author: "client",
      body: parsed.data.body,
      ...(parsed.data.attachment ? { attachment: parsed.data.attachment } : {}),
    });
    const persistClientMessageDurationMs = Date.now() - persistClientMessageStartedAt;

    const attachmentContextStartedAt = Date.now();
    const attachmentContext = await buildAttachmentContext(parsed.data.attachment);
    const attachmentContextDurationMs = Date.now() - attachmentContextStartedAt;

    const agentStartedAt = Date.now();
    const agent = await generatePortalAgentReply({
      clientId: auth.client.id,
      clientName: auth.client.name,
      query: parsed.data.body,
      attachmentContext,
    });
    const agentDurationMs = Date.now() - agentStartedAt;

    const persistAgentAndMemoryStartedAt = Date.now();
    await Promise.all([
      addPortalMessage({
        clientId: auth.client.id,
        author: "agent",
        body: agent.body,
        reasoning: agent.reasoning,
      }),
      addAgentMemoryEntry({
        clientId: auth.client.id,
        query: parsed.data.body,
        responseSummary: agent.memorySummary,
        artifactRefs: agent.artifactRefs,
      }),
    ]);
    const persistAgentAndMemoryDurationMs = Date.now() - persistAgentAndMemoryStartedAt;

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Portal message created with agent response",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: {
        messageId: message.id,
        clientId: auth.client.id,
        timings: {
          parseDurationMs,
          persistClientMessageDurationMs,
          attachmentContextDurationMs,
          agentDurationMs,
          persistAgentAndMemoryDurationMs,
        },
      },
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
