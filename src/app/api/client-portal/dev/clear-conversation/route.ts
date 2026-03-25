import { NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/portal-auth";
import { failure, success } from "@/lib/api";
import fs from "fs";
import path from "path";

/** Development-only — removes all messages and memory for the current client. */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(failure("INTERNAL_ERROR", "Only available in development"), {
      status: 403,
    });
  }

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;
  const { client } = auth;

  const messagesPath = path.join(process.cwd(), ".data", "portal-messages.json");
  const memoryPath = path.join(process.cwd(), ".data", "portal-agent-memory.json");

  // Strip messages for this client
  if (fs.existsSync(messagesPath)) {
    const raw = JSON.parse(fs.readFileSync(messagesPath, "utf-8")) as {
      messages: Array<{ clientId: string }>;
    };
    raw.messages = raw.messages.filter((m) => m.clientId !== client.id);
    fs.writeFileSync(messagesPath, JSON.stringify(raw, null, 2));
  }

  // Strip memory for this client
  if (fs.existsSync(memoryPath)) {
    const raw = JSON.parse(fs.readFileSync(memoryPath, "utf-8")) as {
      entries: Array<{ clientId: string }>;
    };
    raw.entries = raw.entries.filter((e) => e.clientId !== client.id);
    fs.writeFileSync(memoryPath, JSON.stringify(raw, null, 2));
  }

  return NextResponse.json(success({ cleared: true, clientId: client.id }));
}
