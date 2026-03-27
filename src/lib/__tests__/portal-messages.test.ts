/**
 * Enterprise Portal Messages Test Suite
 * 
 * Covers: Message CRUD, read status tracking, thread summaries,
 * client isolation, and unread count calculations.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "@/lib/fs-async";
import type { PortalMessage, PortalMessageAuthor } from "@/lib/portal-messages";

let getPortalMessages: typeof import("@/lib/portal-messages").getPortalMessages;
let addPortalMessage: typeof import("@/lib/portal-messages").addPortalMessage;
let markPortalMessagesReadForClient: typeof import("@/lib/portal-messages").markPortalMessagesReadForClient;
let getUnreadCountForClient: typeof import("@/lib/portal-messages").getUnreadCountForClient;
let getAllPortalMessages: typeof import("@/lib/portal-messages").getAllPortalMessages;
let getThreadSummaries: typeof import("@/lib/portal-messages").getThreadSummaries;

vi.mock("@/lib/fs-async", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fs-async")>();
  return {
    ...actual,
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

describe("Portal Messages Module", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/portal-messages");
    getPortalMessages = mod.getPortalMessages;
    addPortalMessage = mod.addPortalMessage;
    markPortalMessagesReadForClient = mod.markPortalMessagesReadForClient;
    getUnreadCountForClient = mod.getUnreadCountForClient;
    getAllPortalMessages = mod.getAllPortalMessages;
    getThreadSummaries = mod.getThreadSummaries;
  });

  const mockMessages: PortalMessage[] = [
    {
      id: "msg-001",
      clientId: "client-001",
      author: "client",
      body: "Hello, I have a question",
      createdAt: "2025-03-01T10:00:00Z",
      readByClient: true,
    },
    {
      id: "msg-002",
      clientId: "client-001",
      author: "pm",
      body: "Hi, how can I help?",
      createdAt: "2025-03-01T10:05:00Z",
      readByClient: true,
    },
    {
      id: "msg-003",
      clientId: "client-001",
      author: "client",
      body: "When will the project be done?",
      createdAt: "2025-03-01T10:10:00Z",
      readByClient: true,
    },
    {
      id: "msg-004",
      clientId: "client-001",
      author: "pm",
      body: "It will be completed next week",
      createdAt: "2025-03-01T10:15:00Z",
      readByClient: false, // Unread
    },
    {
      id: "msg-005",
      clientId: "client-002",
      author: "client",
      body: "Different client message",
      createdAt: "2025-03-01T11:00:00Z",
      readByClient: true,
    },
    {
      id: "msg-006",
      clientId: "client-001",
      author: "agent",
      body: "Automated response",
      reasoning: "Triggered by schedule inquiry",
      createdAt: "2025-03-01T10:12:00Z",
      readByClient: false,
    },
    {
      id: "msg-007",
      clientId: "client-001",
      author: "system",
      body: "System notification",
      createdAt: "2025-03-01T09:00:00Z",
      readByClient: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Message Retrieval", () => {
    it("should get messages for specific client only", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const messages = await getPortalMessages("client-001");

      expect(messages.every((m) => m.clientId === "client-001")).toBe(true);
      expect(messages).toHaveLength(6);
    });

    it("should return empty array for client with no messages", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const messages = await getPortalMessages("no-messages-client");

      expect(messages).toEqual([]);
    });

    it("should sort messages by creation time", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const messages = await getPortalMessages("client-001");

      // Check chronological order
      for (let i = 1; i < messages.length; i++) {
        const prev = new Date(messages[i - 1].createdAt).getTime();
        const curr = new Date(messages[i].createdAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it("should get all messages for admin", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const messages = await getAllPortalMessages();

      expect(messages).toHaveLength(mockMessages.length);
    });
  });

  describe("Message Creation", () => {
    it("should add message with generated id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const message = await addPortalMessage({
        clientId: "client-001",
        author: "client",
        body: "New message",
      });

      expect(message.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(message.body).toBe("New message");
      expect(message.createdAt).toBeDefined();
    });

    it("should mark client messages as read immediately", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const message = await addPortalMessage({
        clientId: "client-001",
        author: "client",
        body: "From client",
      });

      expect(message.readByClient).toBe(true);
    });

    it("should mark non-client messages as unread", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const pmMessage = await addPortalMessage({
        clientId: "client-001",
        author: "pm",
        body: "From PM",
      });

      expect(pmMessage.readByClient).toBe(false);

      const agentMessage = await addPortalMessage({
        clientId: "client-001",
        author: "agent",
        body: "From Agent",
      });

      expect(agentMessage.readByClient).toBe(false);
    });

    it("should support all author types", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const authors: PortalMessageAuthor[] = ["client", "pm", "system", "agent"];

      for (const author of authors) {
        const message = await addPortalMessage({
          clientId: "client-001",
          author,
          body: `Message from ${author}`,
        });

        expect(message.author).toBe(author);
      }
    });

    it("should include reasoning for agent messages", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const message = await addPortalMessage({
        clientId: "client-001",
        author: "agent",
        body: "Automated response",
        reasoning: "Detected question about timeline",
      });

      expect(message.reasoning).toBe("Detected question about timeline");
    });

    it("should include attachment when provided", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const message = await addPortalMessage({
        clientId: "client-001",
        author: "pm",
        body: "Please see attached",
        attachment: {
          filename: "doc.pdf",
          originalName: "Project_Specs.pdf",
          size: 1024000,
        },
      });

      expect(message.attachment).toEqual({
        filename: "doc.pdf",
        originalName: "Project_Specs.pdf",
        size: 1024000,
      });
    });
  });

  describe("Read Status Management", () => {
    it("should mark messages as read for client", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const changed = await markPortalMessagesReadForClient("client-001");

      expect(changed).toBe(2); // msg-004 and msg-006 were unread
    });

    it("should only mark non-client messages as read", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      await markPortalMessagesReadForClient("client-001");

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      // Client messages should not be modified
      const clientMessages = writtenData.messages.filter(
        (m: PortalMessage) => m.clientId === "client-001" && m.author === "client"
      );
      expect(clientMessages.every((m: PortalMessage) => m.readByClient)).toBe(true);
    });

    it("should return 0 when no unread messages", async () => {
      const allReadMessages = mockMessages.map((m) => ({
        ...m,
        readByClient: true,
      }));
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: allReadMessages }));

      const changed = await markPortalMessagesReadForClient("client-001");

      expect(changed).toBe(0);
    });

    it("should not affect other clients' messages", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      await markPortalMessagesReadForClient("client-001");

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      // Other client's messages should be unchanged
      const otherClientMessages = writtenData.messages.filter(
        (m: PortalMessage) => m.clientId === "client-002"
      );
      expect(otherClientMessages).toHaveLength(1);
    });
  });

  describe("Unread Count", () => {
    it("should calculate unread count correctly", () => {
      const clientMessages = mockMessages.filter((m) => m.clientId === "client-001");
      const unreadCount = getUnreadCountForClient(clientMessages);

      expect(unreadCount).toBe(2); // pm and agent messages that are unread
    });

    it("should not count client messages as unread", () => {
      const messagesWithOnlyClient = [
        {
          id: "msg-test",
          clientId: "client-001",
          author: "client",
          body: "Test",
          createdAt: "2025-03-01T10:00:00Z",
          readByClient: false, // Even if marked unread
        },
      ] as PortalMessage[];

      const unreadCount = getUnreadCountForClient(messagesWithOnlyClient);

      expect(unreadCount).toBe(0);
    });

    it("should handle empty message array", () => {
      const unreadCount = getUnreadCountForClient([]);

      expect(unreadCount).toBe(0);
    });
  });

  describe("Thread Summaries", () => {
    it("should generate thread summaries for all clients", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const summaries = await getThreadSummaries();

      expect(summaries).toHaveLength(2); // client-001 and client-002
    });

    it("should include correct message counts", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const summaries = await getThreadSummaries();

      const client001Summary = summaries.find((s) => s.clientId === "client-001");
      expect(client001Summary?.messageCount).toBe(6);
    });

    it("should include last message preview", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const summaries = await getThreadSummaries();

      const client001Summary = summaries.find((s) => s.clientId === "client-001");
      expect(client001Summary?.lastMessage).toContain("completed next week");
    });

    it("should count unread by admin (client messages)", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const summaries = await getThreadSummaries();

      const client001Summary = summaries.find((s) => s.clientId === "client-001");
      // client-001 has 2 messages from client (msg-001 and msg-003)
      expect(client001Summary?.unreadByAdmin).toBe(2);
    });

    it("should sort messages by most recent first in summary", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const summaries = await getThreadSummaries();

      expect(new Date(summaries[0].lastMessageAt).getTime()).toBeGreaterThanOrEqual(new Date(summaries[1]?.lastMessageAt || 0).getTime());
    });
  });

  describe("Client Isolation", () => {
    it("should not leak messages between clients", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: mockMessages }));

      const client001Messages = await getPortalMessages("client-001");
      const client002Messages = await getPortalMessages("client-002");

      expect(client001Messages.some((m) => m.clientId === "client-002")).toBe(false);
      expect(client002Messages.some((m) => m.clientId === "client-001")).toBe(false);
    });

    it("should handle legacy messages without clientId", async () => {
      const legacyMessages = [
        {
          id: "msg-legacy",
          author: "client",
          body: "Legacy message",
          createdAt: "2025-01-01T00:00:00Z",
          readByClient: true,
          // No clientId
        },
      ];
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ messages: legacyMessages }));

      // Should not throw
      const messages = await getAllPortalMessages();
      expect(messages).toHaveLength(1);
    });
  });
});
