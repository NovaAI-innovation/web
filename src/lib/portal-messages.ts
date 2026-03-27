import { mkdir, readFile, writeFile } from "@/lib/fs-async";
import { dirname, join, resolve } from "node:path";
import { revalidateTag, unstable_cache } from "next/cache";

export type PortalMessageAuthor = "client" | "pm" | "system" | "agent";

export type MessageAttachment = {
  filename: string;
  originalName: string;
  size: number;
};

export type PortalMessage = {
  id: string;
  clientId: string;
  author: PortalMessageAuthor;
  body: string;
  reasoning?: string;
  createdAt: string;
  readByClient: boolean;
  attachment?: MessageAttachment;
};

type LegacyPortalMessage = Omit<PortalMessage, "clientId"> & { clientId?: string };

type PortalMessagesFile = {
  messages: LegacyPortalMessage[];
};

const defaultPortalMessages: PortalMessagesFile = {
  messages: [],
};

function resolveMessagesPath(): string {
  return resolve(join(process.cwd(), ".data", "portal-messages.json"));
}

async function ensureMessagesFile(): Promise<void> {
  const filePath = resolveMessagesPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultPortalMessages, null, 2), "utf-8");
  }
}

const getCachedMessages = unstable_cache(
  async (): Promise<LegacyPortalMessage[]> => {
    await ensureMessagesFile();
    const filePath = resolveMessagesPath();
    const raw = await readFile(filePath, "utf-8");
    const parsed = raw ? (JSON.parse(raw) as PortalMessagesFile) : defaultPortalMessages;
    return parsed.messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },
  ["portal-messages-all"],
  { revalidate: 5, tags: ["portal-messages"] },
);

function normalizeClientMessages(messages: LegacyPortalMessage[], clientId: string): PortalMessage[] {
  return messages
    .filter((message) => message.clientId === clientId)
    .map((message) => ({
      ...message,
      clientId,
      author: message.author,
      body: message.body,
      createdAt: message.createdAt,
      id: message.id,
      readByClient: message.readByClient,
      ...(message.attachment ? { attachment: message.attachment } : {}),
    }));
}

export async function getPortalMessages(clientId: string): Promise<PortalMessage[]> {
  const messages = await getCachedMessages();
  return normalizeClientMessages(messages, clientId);
}

export async function getPortalMessageCount(clientId: string): Promise<number> {
  const messages = await getCachedMessages();
  let count = 0;
  for (const message of messages) {
    if (message.clientId === clientId) count += 1;
  }
  return count;
}

export async function addPortalMessage(input: {
  clientId: string;
  author: PortalMessageAuthor;
  body: string;
  reasoning?: string;
  attachment?: MessageAttachment;
}): Promise<PortalMessage> {
  await ensureMessagesFile();
  const filePath = resolveMessagesPath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as PortalMessagesFile) : defaultPortalMessages;

  const message: PortalMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientId: input.clientId,
    author: input.author,
    body: input.body,
    ...(input.reasoning ? { reasoning: input.reasoning } : {}),
    createdAt: new Date().toISOString(),
    readByClient: input.author === "client",
    ...(input.attachment ? { attachment: input.attachment } : {}),
  };

  parsed.messages.push(message);
  await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  revalidateTag("portal-messages", "max");
  return message;
}

export async function markPortalMessagesReadForClient(clientId: string): Promise<number> {
  await ensureMessagesFile();
  const filePath = resolveMessagesPath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as PortalMessagesFile) : defaultPortalMessages;

  let changed = 0;
  parsed.messages = parsed.messages.map((message) => {
    if (message.clientId !== clientId) return message;

    if (!message.readByClient && message.author !== "client") {
      changed += 1;
      return { ...message, readByClient: true };
    }
    return message;
  });

  if (changed > 0) {
    await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
    revalidateTag("portal-messages", "max");
  }

  return changed;
}

export function getUnreadCountForClient(messages: PortalMessage[]): number {
  return messages.filter((message) => message.author !== "client" && !message.readByClient).length;
}

// --- Admin helpers ---

export async function getAllPortalMessages(): Promise<PortalMessage[]> {
  const messages = await getCachedMessages();
  return messages.map((m) => ({ ...m, clientId: m.clientId ?? "" }));
}

export type ThreadSummary = {
  clientId: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string;
  unreadByAdmin: number;
};

export async function getThreadSummaries(): Promise<ThreadSummary[]> {
  const messages = await getCachedMessages();
  const byClient = new Map<string, ThreadSummary>();

  for (const m of messages) {
    const cid = m.clientId ?? "";
    if (!cid) continue;
    const existing = byClient.get(cid);
    if (!existing) {
      byClient.set(cid, {
        clientId: cid,
        messageCount: 1,
        lastMessage: m.body.slice(0, 120),
        lastMessageAt: m.createdAt,
        unreadByAdmin: m.author === "client" ? 1 : 0,
      });
      continue;
    }

    existing.messageCount += 1;
    if (m.author === "client") existing.unreadByAdmin += 1;
    if (new Date(m.createdAt).getTime() >= new Date(existing.lastMessageAt).getTime()) {
      existing.lastMessageAt = m.createdAt;
      existing.lastMessage = m.body.slice(0, 120);
    }
  }

  return Array.from(byClient.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}
