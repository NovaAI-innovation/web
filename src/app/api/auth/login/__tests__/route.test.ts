/**
 * Enterprise Login API Test Suite
 * 
 * Covers: Authentication flows, rate limiting, account lockout,
 * 2FA challenges, legacy password migration, and audit logging.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import {
  clearFailedLogins,
  createSession,
  logAuditEvent,
  recordFailedLogin,
  setSessionCookies,
  verifyPassword,
} from "@/lib/auth";
import { send2FACode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Mocks
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
    twoFactorChallenge: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");
  return {
    ...actual as any,
    verifyPassword: vi.fn(),
    recordFailedLogin: vi.fn(),
    clearFailedLogins: vi.fn(),
    createSession: vi.fn(),
    setSessionCookies: vi.fn(),
    logAuditEvent: vi.fn(),
  };
});

vi.mock("@/lib/rate-limit", async () => {
  return {
    rateLimit: vi.fn(),
  };
});

vi.mock("@/lib/email", () => ({
  send2FACode: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  logEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("POST /api/auth/login", () => {
  const createRequest = (body: object, headers?: Record<string, string>) => {
    return new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "192.168.1.1",
        "User-Agent": "TestAgent",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    passwordHash: "$2b$12$hashedpassword",
    legacySalt: null,
    emailVerifiedAt: new Date(),
    accountLockedUntil: null,
    twoFactorEnabled: false,
    role: { name: "client" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, retryAfterSeconds: 60 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation", () => {
    it("should reject invalid email format", async () => {
      const request = createRequest({
        email: "not-an-email",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject empty password", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing fields", async () => {
      const request = createRequest({ email: "test@example.com" });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid JSON", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Rate Limiting", () => {
    it("should reject when IP rate limit exceeded", async () => {
      vi.mocked(rateLimit).mockReturnValue({ allowed: false, retryAfterSeconds: 300 });

      const request = createRequest({
        email: "test@example.com",
        password: "password",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error.code).toBe("RATE_LIMITED");
      expect(response.headers.get("Retry-After")).toBe("300");
    });

    it("should reject when email rate limit exceeded", async () => {
      vi.mocked(rateLimit)
        .mockReturnValueOnce({ allowed: true, retryAfterSeconds: 60 }) // IP check passes
        .mockReturnValueOnce({ allowed: false, retryAfterSeconds: 600 }); // Email check fails

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const request = createRequest({
        email: "test@example.com",
        password: "password",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error.code).toBe("RATE_LIMITED");
    });
  });

  describe("Authentication", () => {
    it("should reject non-existent user with constant-time response", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: false, needsRehash: false });

      const request = createRequest({
        email: "nonexistent@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid email or password");
      // Verify fake bcrypt work was done for timing
      expect(verifyPassword).toHaveBeenCalledWith(
        "password123",
        expect.stringContaining("$2b$")
      );
    });

    it("should reject incorrect password", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: false, needsRehash: false });

      const request = createRequest({
        email: "test@example.com",
        password: "wrongpassword",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(recordFailedLogin).toHaveBeenCalledWith("user-123");
    });

    it("should reject locked account", async () => {
      const lockedUser = {
        ...mockUser,
        accountLockedUntil: new Date(Date.now() + 3600000), // Locked for 1 hour
      };
      (prisma.user.findUnique as any).mockResolvedValue(lockedUser);

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe("ACCOUNT_LOCKED");
    });

    it("should reject unverified email", async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerifiedAt: null,
      };
      (prisma.user.findUnique as any).mockResolvedValue(unverifiedUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe("EMAIL_NOT_VERIFIED");
    });

    it("should authenticate successfully with valid credentials", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(createSession).mockResolvedValue({ token: "session-token", role: "client" });

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe("user-123");
      expect(body.data.role).toBe("client");
      expect(body.data.redirectTo).toBe("/client-portal/dashboard");
      expect(clearFailedLogins).toHaveBeenCalledWith("user-123");
      expect(setSessionCookies).toHaveBeenCalled();
    });
  });

  describe("Legacy Password Migration", () => {
    it("should upgrade legacy SHA-256 password to bcrypt", async () => {
      const legacyUser = {
        ...mockUser,
        passwordHash: "legacyhash",
        legacySalt: "legacysalt",
      };
      (prisma.user.findUnique as any).mockResolvedValue(legacyUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: true });
      (prisma.user.update as any).mockResolvedValue({ id: "user-123" });

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            legacySalt: null,
          }),
        }),
      );

      const updateCall = (prisma.user.update as any).mock.calls[0][0];
      expect(updateCall.data.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe("Two-Factor Authentication", () => {
    it("should issue 2FA challenge when enabled", async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
      };
      (prisma.user.findUnique as any).mockResolvedValue(userWith2FA);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      (prisma.twoFactorChallenge.create as any).mockResolvedValue({ id: "challenge-123" });
      vi.mocked(send2FACode).mockResolvedValue("sent");

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.requiresTwoFactor).toBe(true);
      expect(body.data.challengeId).toBe("challenge-123");
      expect(body.data.email).toContain("***");
      expect(send2FACode).toHaveBeenCalled();
    });

    it("should handle 2FA email failure gracefully", async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
      };
      (prisma.user.findUnique as any).mockResolvedValue(userWith2FA);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(send2FACode).mockRejectedValue(new Error("SMTP Error"));

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe("DEPENDENCY_FAILURE");
    });
  });

  describe("Role-Based Redirects", () => {
    it("should redirect admin to admin dashboard", async () => {
      const adminUser = {
        ...mockUser,
        role: { name: "admin" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(adminUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(createSession).mockResolvedValue({ token: "session-token", role: "admin" });

      const request = createRequest({
        email: "admin@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.data.redirectTo).toBe("/admin/dashboard");
      expect(body.data.role).toBe("admin");
    });

    it("should redirect developer to developer dashboard", async () => {
      const devUser = {
        ...mockUser,
        role: { name: "developer" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(devUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(createSession).mockResolvedValue({ token: "session-token", role: "developer" });

      const request = createRequest({
        email: "dev@example.com",
        password: "password123",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.data.redirectTo).toBe("/developer/dashboard");
      expect(body.data.role).toBe("developer");
    });
  });

  describe("Session Management", () => {
    it("should set appropriate session duration based on role", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(createSession).mockResolvedValue({ token: "token", role: "client" });

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      await POST(request);

      // Client session should be 8 hours (28800 seconds)
      expect(setSessionCookies).toHaveBeenCalledWith(
        expect.any(Object),
        "token",
        "client",
        28800
      );
    });
  });

  describe("Audit Logging", () => {
    it("should log successful login", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: true, needsRehash: false });
      vi.mocked(createSession).mockResolvedValue({ token: "token", role: "client" });

      const request = createRequest({
        email: "test@example.com",
        password: "password123",
      });

      await POST(request);

      expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        userId: "user-123",
        action: "auth.login.success",
        ipAddress: "192.168.1.1",
      }));
    });

    it("should log failed login attempts", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue({ valid: false, needsRehash: false });

      const request = createRequest({
        email: "test@example.com",
        password: "wrongpassword",
      });

      await POST(request);

      expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        userId: "user-123",
        action: "auth.login.failure",
        metadata: { reason: "bad_password" },
      }));
    });
  });
});
