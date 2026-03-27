/**
 * Enterprise Client Store Test Suite
 * 
 * Covers: Client CRUD, password management, notification preferences,
 * token generation, and password reset flows.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "@/lib/fs-async";

let getAllClients: typeof import("@/lib/client-store").getAllClients;
let findClientByEmail: typeof import("@/lib/client-store").findClientByEmail;
let findClientById: typeof import("@/lib/client-store").findClientById;
let updateClient: typeof import("@/lib/client-store").updateClient;
let registerClient: typeof import("@/lib/client-store").registerClient;
let verifyClientCredentials: typeof import("@/lib/client-store").verifyClientCredentials;
let changeClientPassword: typeof import("@/lib/client-store").changeClientPassword;
let generateToken: typeof import("@/lib/client-store").generateToken;
let parseToken: typeof import("@/lib/client-store").parseToken;
let createResetToken: typeof import("@/lib/client-store").createResetToken;
let resetPasswordWithToken: typeof import("@/lib/client-store").resetPasswordWithToken;
let getNotificationPrefs: typeof import("@/lib/client-store").getNotificationPrefs;
let updateNotificationPrefs: typeof import("@/lib/client-store").updateNotificationPrefs;

vi.mock("@/lib/fs-async", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fs-async")>();
  return {
    ...actual,
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

describe("Client Store Module", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/client-store");
    getAllClients = mod.getAllClients;
    findClientByEmail = mod.findClientByEmail;
    findClientById = mod.findClientById;
    updateClient = mod.updateClient;
    registerClient = mod.registerClient;
    verifyClientCredentials = mod.verifyClientCredentials;
    changeClientPassword = mod.changeClientPassword;
    generateToken = mod.generateToken;
    parseToken = mod.parseToken;
    createResetToken = mod.createResetToken;
    resetPasswordWithToken = mod.resetPasswordWithToken;
    getNotificationPrefs = mod.getNotificationPrefs;
    updateNotificationPrefs = mod.updateNotificationPrefs;
  });

  const mockClients = [
    {
      id: "client-001",
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      passwordHash: "hashedpassword123",
      salt: "salt123",
      createdAt: "2025-01-01T00:00:00Z",
      notificationPrefs: {
        email: true,
        messages: true,
        milestones: true,
        budget: false,
      },
    },
    {
      id: "client-002",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "555-5678",
      passwordHash: "hashedpassword456",
      salt: "salt456",
      createdAt: "2025-02-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Client Retrieval", () => {
    it("should get all clients", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const clients = await getAllClients();

      expect(clients).toHaveLength(2);
    });

    it("should find client by email (case insensitive)", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const client = await findClientByEmail("JOHN@EXAMPLE.COM");

      expect(client).toBeDefined();
      expect(client?.name).toBe("John Doe");
    });

    it("should return null for non-existent email", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const client = await findClientByEmail("nonexistent@example.com");

      expect(client).toBeNull();
    });

    it("should find client by id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const client = await findClientById("client-002");

      expect(client).toBeDefined();
      expect(client?.name).toBe("Jane Smith");
    });

    it("should return null for non-existent id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const client = await findClientById("non-existent");

      expect(client).toBeNull();
    });
  });

  describe("Client Updates", () => {
    it("should update client name", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateClient("client-001", { name: "John Updated" });

      expect(updated?.name).toBe("John Updated");
    });

    it("should update client email (lowercase)", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateClient("client-001", { email: "NEWEMAIL@EXAMPLE.COM" });

      expect(updated?.email).toBe("newemail@example.com");
    });

    it("should update client phone", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateClient("client-001", { phone: "555-9999" });

      expect(updated?.phone).toBe("555-9999");
    });

    it("should return null when updating non-existent client", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const updated = await updateClient("non-existent", { name: "Test" });

      expect(updated).toBeNull();
    });
  });

  describe("Client Registration", () => {
    it("should register new client with generated id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const client = await registerClient({
        name: "New Client",
        email: "new@example.com",
        phone: "555-0000",
        password: "password123",
      });

      expect(client.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(client.name).toBe("New Client");
      expect(client.email).toBe("new@example.com");
      expect(client.passwordHash).not.toBe("password123"); // Should be hashed
    });

    it("should reject duplicate email", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      await expect(
        registerClient({
          name: "Duplicate",
          email: "john@example.com",
          phone: "555-0000",
          password: "password123",
        })
      ).rejects.toThrow("EMAIL_EXISTS");
    });

    it("should reject duplicate email (case insensitive)", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      await expect(
        registerClient({
          name: "Duplicate",
          email: "JOHN@EXAMPLE.COM",
          phone: "555-0000",
          password: "password123",
        })
      ).rejects.toThrow("EMAIL_EXISTS");
    });

    it("should hash password with salt", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const client = await registerClient({
        name: "Test",
        email: "test@example.com",
        phone: "555-0000",
        password: "mypassword",
      });

      expect(client.salt).toBeDefined();
      expect(client.salt.length).toBe(32); // 16 bytes hex = 32 chars
      expect(client.passwordHash).not.toBe("mypassword");
      expect(client.passwordHash.length).toBe(64); // SHA-256 hex = 64 chars
    });
  });

  describe("Password Verification", () => {
    it("should verify correct password", async () => {
      const crypto = await import("node:crypto");
      const salt = "testsalt";
      const password = "testpassword";
      const hash = crypto.createHash("sha256").update(password + salt).digest("hex");
      
      const client = {
        ...mockClients[0],
        passwordHash: hash,
        salt,
      };
      
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [client] }));

      const result = await verifyClientCredentials("john@example.com", password);

      expect(result).toBeDefined();
      expect(result?.email).toBe("john@example.com");
    });

    it("should reject incorrect password", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const result = await verifyClientCredentials("john@example.com", "wrongpassword");

      expect(result).toBeNull();
    });

    it("should return null for non-existent user", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const result = await verifyClientCredentials("nonexistent@example.com", "password");

      expect(result).toBeNull();
    });
  });

  describe("Password Changes", () => {
    it("should change password with correct current password", async () => {
      const crypto = await import("node:crypto");
      const salt = "testsalt";
      const currentPassword = "currentpass";
      const hash = crypto.createHash("sha256").update(currentPassword + salt).digest("hex");
      
      const client = {
        ...mockClients[0],
        passwordHash: hash,
        salt,
      };
      
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [client] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await changeClientPassword("client-001", currentPassword, "newpassword123");

      expect(result.success).toBe(true);
    });

    it("should reject password change with wrong current password", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const result = await changeClientPassword("client-001", "wrongpassword", "newpassword123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Current password is incorrect");
    });

    it("should return error for non-existent client", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const result = await changeClientPassword("non-existent", "password", "newpassword");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Account not found");
    });
  });

  describe("Token Management", () => {
    it("should generate valid token", () => {
      const token = generateToken("client-001");

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it("should parse valid token", () => {
      const token = generateToken("client-001");
      const parsed = parseToken(token);

      expect(parsed).toBeDefined();
      expect(parsed?.clientId).toBe("client-001");
      expect(parsed?.timestamp).toBeGreaterThan(0);
    });

    it("should return null for invalid token", () => {
      const parsed = parseToken("invalid-token");

      expect(parsed).toBeNull();
    });

    it("should return null for malformed token", () => {
      const parsed = parseToken("!!!@@@###");

      expect(parsed).toBeNull();
    });

    it("should generate unique tokens", () => {
      const token1 = generateToken("client-001");
      const token2 = generateToken("client-001");

      expect(token1).not.toBe(token2);
    });
  });

  describe("Password Reset", () => {
    it("should create reset token for existing email", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const token = await createResetToken("john@example.com");

      expect(token).toBeDefined();
      expect(token?.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it("should return null for non-existent email", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const token = await createResetToken("nonexistent@example.com");

      expect(token).toBeNull();
    });

    it("should reset password with valid token", async () => {
      const crypto = await import("node:crypto");
      const tokenHash = crypto.createHash("sha256").update("rawtoken").digest("hex");
      const clientWithToken = {
        ...mockClients[0],
        resetToken: tokenHash,
        resetTokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      };
      
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [clientWithToken] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await resetPasswordWithToken("rawtoken", "newpassword123");

      expect(result.success).toBe(true);
    });

    it("should reject expired token", async () => {
      const crypto = await import("node:crypto");
      const tokenHash = crypto.createHash("sha256").update("rawtoken").digest("hex");
      const clientWithExpiredToken = {
        ...mockClients[0],
        resetToken: tokenHash,
        resetTokenExpiry: new Date(Date.now() - 3600000).toISOString(), // Expired
      };
      
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: [clientWithExpiredToken] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await resetPasswordWithToken("rawtoken", "newpassword123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reset link has expired");
    });

    it("should reject invalid token", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const result = await resetPasswordWithToken("invalidtoken", "newpassword123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired reset link");
    });
  });

  describe("Notification Preferences", () => {
    it("should get default preferences when none set", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const prefs = await getNotificationPrefs("client-002");

      expect(prefs).toEqual({
        email: true,
        messages: true,
        milestones: true,
        budget: false,
      });
    });

    it("should get saved preferences", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const prefs = await getNotificationPrefs("client-001");

      expect(prefs.email).toBe(true);
      expect(prefs.budget).toBe(false);
    });

    it("should update preferences", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateNotificationPrefs("client-001", {
        budget: true,
        email: false,
      });

      expect(updated.budget).toBe(true);
      expect(updated.email).toBe(false);
      expect(updated.messages).toBe(true); // Unchanged
      expect(updated.milestones).toBe(true); // Unchanged
    });

    it("should merge partial updates", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateNotificationPrefs("client-001", {
        budget: true,
      });

      expect(updated.budget).toBe(true);
      expect(updated.email).toBe(true); // Original value
    });

    it("should return defaults for non-existent client", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ clients: mockClients }));

      const prefs = await getNotificationPrefs("non-existent");

      expect(prefs).toEqual({
        email: true,
        messages: true,
        milestones: true,
        budget: false,
      });
    });
  });
});
