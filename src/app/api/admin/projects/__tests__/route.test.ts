/**
 * Enterprise Admin Projects API Test Suite
 * 
 * Covers: Admin authentication, project CRUD operations,
 * validation, and authorization checks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "../route";
import * as adminAuth from "@/lib/admin-auth";
import * as projectStore from "@/lib/project-store";

// Mocks
vi.mock("@/lib/admin-auth", () => ({
  requireAdminAuth: vi.fn(),
}));

vi.mock("@/lib/project-store", () => ({
  getAllProjects: vi.fn(),
  createProject: vi.fn(),
}));

describe("Admin Projects API", () => {
  const createRequest = (method: string, body?: object) => {
    const init: RequestInit = { method };
    if (body) {
      init.body = JSON.stringify(body);
      init.headers = { "Content-Type": "application/json" };
    }
    return new Request(`http://localhost/api/admin/projects`, init);
  };

  const mockAdminUser = {
    id: "admin-123",
    name: "Admin User",
    email: "admin@example.com",
    role: { name: "admin" },
  };

  const mockProjects = [
    {
      id: "proj-001",
      name: "Project 1",
      clientId: "client-001",
      status: "active",
      progress: 50,
      budget: { allocated: 100000, spent: 50000 },
      schedule: { baselineEnd: "2025-06-01", currentEnd: "2025-06-15", daysVariance: 14 },
      milestones: [],
      activity: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/projects", () => {
    it("should return all projects for authenticated admin", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      (projectStore.getAllProjects as any).mockResolvedValue(mockProjects);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(mockProjects);
      expect(body.error).toBeNull();
    });

    it("should reject unauthenticated requests", async () => {
      const mockResponse = new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR" } }), {
        status: 401,
      });
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: false,
        response: mockResponse,
      });

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("should reject non-admin users", async () => {
      const mockResponse = new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR" } }), {
        status: 403,
      });
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: false,
        response: mockResponse,
      });

      const response = await GET();
      expect(response.status).toBe(403);
    });

    it("should handle empty project list", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      (projectStore.getAllProjects as any).mockResolvedValue([]);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe("POST /api/admin/projects", () => {
    const validProjectData = {
      name: "New Project",
      clientId: "client-001",
      status: "planning",
      progress: 0,
      budget: { allocated: 100000, spent: 0 },
      schedule: { baselineEnd: "2025-12-01", currentEnd: "2025-12-01", daysVariance: 0 },
      milestones: [],
      activity: [],
    };

    it("should create project with valid data", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      const createdProject = { id: "proj-new", ...validProjectData };
      (projectStore.createProject as any).mockResolvedValue(createdProject);

      const request = createRequest("POST", validProjectData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.id).toBe("proj-new");
      expect(body.data.name).toBe("New Project");
    });

    it("should reject project without name", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const invalidData = { ...validProjectData, name: "" };
      const request = createRequest("POST", invalidData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid status values", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const invalidData = { ...validProjectData, status: "invalid-status" };
      const request = createRequest("POST", invalidData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject progress outside 0-100 range", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const invalidData = { ...validProjectData, progress: 150 };
      const request = createRequest("POST", invalidData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject negative budget values", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const invalidData = {
        ...validProjectData,
        budget: { allocated: -1000, spent: 0 },
      };
      const request = createRequest("POST", invalidData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid JSON", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const request = new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept all valid status values", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      (projectStore.createProject as any).mockImplementation((data: any) =>
        Promise.resolve({ id: "proj-test", ...data })
      );

      const statuses = ["active", "planning", "completed"];

      for (const status of statuses) {
        const data = { ...validProjectData, status };
        const request = createRequest("POST", data);
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });

    it("should accept project without optional clientId", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      const createdProject = { id: "proj-new", ...validProjectData, clientId: undefined };
      (projectStore.createProject as any).mockResolvedValue(createdProject);

      const data = { ...validProjectData };
      delete (data as any).clientId;
      const request = createRequest("POST", data);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should use default values when optional fields omitted", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });
      (projectStore.createProject as any).mockImplementation((data: any) =>
        Promise.resolve({ id: "proj-test", ...data })
      );

      const minimalData = {
        name: "Minimal Project",
        budget: { allocated: 50000 },
        schedule: { baselineEnd: "2025-06-01", currentEnd: "2025-06-01" },
      };
      const request = createRequest("POST", minimalData);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.status).toBe("planning");
      expect(body.data.progress).toBe(0);
      expect(body.data.budget.spent).toBe(0);
      expect(body.data.schedule.daysVariance).toBe(0);
    });

    it("should handle unauthenticated create request", async () => {
      const mockResponse = new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR" } }), {
        status: 401,
      });
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: false,
        response: mockResponse,
      });

      const request = createRequest("POST", validProjectData);
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should validate milestone structure", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const dataWithMilestone = {
        ...validProjectData,
        milestones: [
          {
            id: "m-1",
            title: "Milestone 1",
            completed: false,
            dueDate: "2025-06-01",
          },
        ],
      };
      (projectStore.createProject as any).mockResolvedValue({
        id: "proj-test",
        ...dataWithMilestone,
      });

      const request = createRequest("POST", dataWithMilestone);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should reject milestones without required fields", async () => {
      (adminAuth.requireAdminAuth as any).mockResolvedValue({
        ok: true,
        user: mockAdminUser,
      });

      const dataWithInvalidMilestone = {
        ...validProjectData,
        milestones: [{ id: "m-1" }], // Missing title, completed, dueDate
      };

      const request = createRequest("POST", dataWithInvalidMilestone);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
