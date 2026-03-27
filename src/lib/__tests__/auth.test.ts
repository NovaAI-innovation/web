/**
 * Enterprise Authentication & Authorization Test Suite
 * 
 * Covers: Password hashing, session management, role-based access control,
 * account lockouts, audit logging, and 2FA flows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  requireAuth,
  requireRole,
  recordFailedLogin,
  clearFailedLogins,
  logAuditEvent,
  setSessionCookies,
  clearSessionCookies,
  getMaxAgeForRole,
  ROLE_REDIRECT,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    twoFactorChallenge: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  logEvent: vi.fn(),
}));

describe("Authentication Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Password Hashing", () => {
    it("should hash password with bcrypt using correct rounds for clients", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password, false);

      expect(hash).toMatch(/^\$2[ab]\$12\$/); // 12 rounds for clients (bcrypt uses $2a$ or $2b$)
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it("should hash password with higher rounds for privileged users", async () => {
      const password = "AdminPass456!";
      const hash = await hashPassword(password, true);

      expect(hash).toMatch(/^\$2[ab]\$14\$/); // 14 rounds for admin/developer
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it("should verify bcrypt password correctly", async () => {
      const password = "TestPass789!";
      const hash = await bcrypt.hash(password, 12);

      const result = await verifyPassword(password, hash, null);

      expect(result.valid).toBe(true);
      expect(result.needsRehash).toBe(false);
    });

    it("should reject incorrect bcrypt password", async () => {
      const hash = await bcrypt.hash("CorrectPass", 12);

      const result = await verifyPassword("WrongPass", hash, null);

      expect(result.valid).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it("should verify legacy SHA-256 password and signal rehash needed", async () => {
      const password = "LegacyPass";
      const salt = "abc123";
      const crypto = await import("node:crypto");
      const legacyHash = crypto.createHash("sha256").update(password + salt).digest("hex");

      const result = await verifyPassword(password, legacyHash, salt);

      expect(result.valid).toBe(true);
      expect(result.needsRehash).toBe(true);
    });

    it("should reject invalid legacy password", async () => {
      const salt = "abc123";
      const crypto = await import("node:crypto");
      const legacyHash = crypto.createHash("sha256").update("CorrectPass" + salt).digest("hex");

      const result = await verifyPassword("WrongPass", legacyHash, salt);

      expect(result.valid).toBe(false);
      expect(result.needsRehash).toBe(false);
    });

    it("should handle missing legacy salt gracefully", async () => {
      const result = await verifyPassword("AnyPass", "invalidhash", null);

      expect(result.valid).toBe(false);
      expect(result.needsRehash).toBe(false);
    });
  });

  describe("Session Management", () => {
    it("should create session with correct token format", async () => {
      const mockUser = {
        id: "user-123",
        role: { name: "client" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.session.create as any).mockResolvedValue({ id: "session-1" });

      const result = await createSession("user-123", "192.168.1.1", "TestAgent");

      expect(result.token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex = 64 chars
      expect(result.role).toBe("client");
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          ipAddress: "192.168.1.1",
          userAgent: "TestAgent",
          expiresAt: expect.any(Date),
        }),
      });
    });

    it("should set correct session duration for admin role", async () => {
      const mockUser = {
        id: "admin-123",
        role: { name: "admin" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.session.create as any).mockResolvedValue({ id: "session-1" });

      await createSession("admin-123", "192.168.1.1", "TestAgent");

      const call = (prisma.session.create as any).mock.calls[0][0];
      const expiresAt = call.data.expiresAt;
      const now = new Date();
      const durationHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(durationHours).toBeCloseTo(24, 0); // 24 hours for admin
    });

    it("should set correct session duration for client role", async () => {
      const mockUser = {
        id: "client-123",
        role: { name: "client" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.session.create as any).mockResolvedValue({ id: "session-1" });

      await createSession("client-123", "192.168.1.1", "TestAgent");

      const call = (prisma.session.create as any).mock.calls[0][0];
      const expiresAt = call.data.expiresAt;
      const now = new Date();
      const durationHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(durationHours).toBeCloseTo(8, 0); // 8 hours for client
    });

    it("should destroy session by token hash", async () => {
      (prisma.session.deleteMany as any).mockResolvedValue({ count: 1 });

      await destroySession("test-token-123");

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
      });
    });
  });

  describe("Auth Guards", () => {
    it("should reject when no session token exists", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      });

      const result = await requireAuth();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should reject when session is invalid", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "invalid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue(null);

      const result = await requireAuth();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should reject when session is expired", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerifiedAt: new Date(),
          role: { name: "client" },
        },
      });
      (prisma.session.delete as any).mockResolvedValue({});

      const result = await requireAuth();

      expect(result.ok).toBe(false);
      expect(prisma.session.delete).toHaveBeenCalled();
    });

    it("should reject unverified email", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() + 3600000),
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerifiedAt: null, // Not verified
          role: { name: "client" },
        },
      });

      const result = await requireAuth();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it("should reject locked account", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() + 3600000),
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerifiedAt: new Date(),
          accountLockedUntil: new Date(Date.now() + 3600000), // Locked for 1 hour
          role: { name: "client" },
        },
      });

      const result = await requireAuth();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it("should accept valid session", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        emailVerifiedAt: new Date(),
        accountLockedUntil: null,
        role: { name: "client" },
      };
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });

      const result = await requireAuth();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user.id).toBe("user-123");
        expect(result.user.role.name).toBe("client");
      }
    });
  });

  describe("Role-Based Access Control", () => {
    it("should deny access when role does not match", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        emailVerifiedAt: new Date(),
        accountLockedUntil: null,
        role: { name: "client" },
      };
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });

      const result = await requireRole("admin");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it("should grant access when role matches", async () => {
      const mockUser = {
        id: "admin-123",
        email: "admin@example.com",
        emailVerifiedAt: new Date(),
        accountLockedUntil: null,
        role: { name: "admin" },
      };
      (cookies as any).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      });
      (prisma.session.findUnique as any).mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });

      const result = await requireRole("admin");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user.role.name).toBe("admin");
      }
    });
  });

  describe("Account Lockout", () => {
    it("should increment failed login count", async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: "user-123",
        failedLoginCount: 3,
      });

      await recordFailedLogin("user-123");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { failedLoginCount: { increment: 1 } },
      });
    });

    it("should lock account after threshold exceeded", async () => {
      (prisma.user.update as any)
        .mockResolvedValueOnce({ id: "user-123", failedLoginCount: 10 })
        .mockResolvedValueOnce({ id: "user-123", accountLockedAt: new Date() });

      await recordFailedLogin("user-123");

      expect(prisma.user.update).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenLastCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          accountLockedAt: expect.any(Date),
          accountLockedUntil: expect.any(Date),
        }),
      });
    });

    it("should clear failed logins on successful login", async () => {
      (prisma.user.update as any).mockResolvedValue({ id: "user-123" });

      await clearFailedLogins("user-123");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          failedLoginCount: 0,
          accountLockedAt: null,
          accountLockedUntil: null,
          lastLoginAt: expect.any(Date),
        }),
      });
    });
  });

  describe("Audit Logging", () => {
    it("should create audit event with all fields", async () => {
      (prisma.auditEvent.create as any).mockResolvedValue({ id: "audit-1" });

      await logAuditEvent({
        userId: "user-123",
        action: "project.create",
        resourceType: "project",
        resourceId: "proj-456",
        ipAddress: "192.168.1.1",
        userAgent: "TestAgent",
        metadata: { foo: "bar" },
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          action: "project.create",
          resourceType: "project",
          resourceId: "proj-456",
          ipAddress: "192.168.1.1",
          userAgent: "TestAgent",
          metadata: { foo: "bar" },
        }),
      });
    });

    it("should handle audit logging errors gracefully", async () => {
      (prisma.auditEvent.create as any).mockRejectedValue(new Error("DB Error"));

      // Should not throw
      await expect(
        logAuditEvent({
          userId: "user-123",
          action: "test.action",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Cookie Management", () => {
    it("should set session cookies with correct security attributes", () => {
      const mockResponse = {
        cookies: {
          set: vi.fn(),
        },
      } as any;

      setSessionCookies(mockResponse, "token123", "client", 28800);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sessionToken",
        "token123",
        expect.objectContaining({
          path: "/",
          maxAge: 28800,
          sameSite: "strict",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
      );

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "userRole",
        "client",
        expect.objectContaining({
          path: "/",
          maxAge: 28800,
          sameSite: "strict",
          httpOnly: false, // Role cookie is readable by middleware
          secure: process.env.NODE_ENV === "production",
        })
      );
    });

    it("should clear all session cookies", () => {
      const mockResponse = {
        cookies: {
          set: vi.fn(),
        },
      } as any;

      clearSessionCookies(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sessionToken",
        "",
        expect.objectContaining({ path: "/", maxAge: 0 })
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "userRole",
        "",
        expect.objectContaining({ path: "/", maxAge: 0 })
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "portalToken",
        "",
        expect.objectContaining({ path: "/", maxAge: 0 })
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "adminToken",
        "",
        expect.objectContaining({ path: "/", maxAge: 0 })
      );
    });
  });

  describe("Utility Functions", () => {
    it("should return correct max age for each role", () => {
      expect(getMaxAgeForRole("client")).toBe(8 * 60 * 60); // 8 hours
      expect(getMaxAgeForRole("admin")).toBe(24 * 60 * 60); // 24 hours
      expect(getMaxAgeForRole("developer")).toBe(8 * 60 * 60); // 8 hours
      expect(getMaxAgeForRole("unknown")).toBe(8 * 60 * 60); // defaults to client
    });

    it("should have correct role redirect mappings", () => {
      expect(ROLE_REDIRECT.client).toBe("/client-portal/dashboard");
      expect(ROLE_REDIRECT.admin).toBe("/admin/dashboard");
      expect(ROLE_REDIRECT.developer).toBe("/developer/dashboard");
    });
  });
});
