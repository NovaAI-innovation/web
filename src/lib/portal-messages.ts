import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { revalidateTag, unstable_cache } from "next/cache";

export type PortalMessageAuthor = "client" | "pm" | "system";

export type MessageAttachment = {
  filename: string;
  originalName: string;
  size: number;
};

export type PortalMessage = {
  id: string;
  author: PortalMessageAuthor;
  body: string;
  createdAt: string;
  readByClient: boolean;
  attachment?: MessageAttachment;
};

type PortalMessagesFile = {
  messages: PortalMessage[];
};

const defaultPortalMessages: PortalMessagesFile = {
  messages: [
    {
      id: "msg-welcome",
      author: "pm",
      body: "Welcome to your portal. Use this thread for quick updates and questions.",
      createdAt: "2026-03-20T09:00:00.000Z",
      readByClient: false,
    },
  ],
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
  async (): Promise<PortalMessage[]> => {
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

export async function getPortalMessages(): Promise<PortalMessage[]> {
  return getCachedMessages();
}

export async function addPortalMessage(input: {
  author: PortalMessageAuthor;
  body: string;
  attachment?: MessageAttachment;
}): Promise<PortalMessage> {
  await ensureMessagesFile();
  const filePath = resolveMessagesPath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as PortalMessagesFile) : defaultPortalMessages;

  const message: PortalMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: input.author,
    body: input.body,
    createdAt: new Date().toISOString(),
    readByClient: input.author === "client",
    ...(input.attachment ? { attachment: input.attachment } : {}),
  };

  parsed.messages.push(message);
  await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  revalidateTag("portal-messages", "max");
  return message;
}

export async function markPortalMessagesReadForClient(): Promise<number> {
  await ensureMessagesFile();
  const filePath = resolveMessagesPath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as PortalMessagesFile) : defaultPortalMessages;

  let changed = 0;
  parsed.messages = parsed.messages.map((message) => {
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
