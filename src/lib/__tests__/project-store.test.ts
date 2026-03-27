/**
 * Enterprise Project Store Test Suite
 * 
 * Covers: CRUD operations, milestone management, activity tracking,
 * budget calculations, and progress aggregation.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "@/lib/fs-async";
import type { Project, Activity } from "@/lib/project-store";

let getAllProjects: typeof import("@/lib/project-store").getAllProjects;
let getProjectById: typeof import("@/lib/project-store").getProjectById;
let getProjectsByClient: typeof import("@/lib/project-store").getProjectsByClient;
let getDashboardData: typeof import("@/lib/project-store").getDashboardData;
let createProject: typeof import("@/lib/project-store").createProject;
let updateProject: typeof import("@/lib/project-store").updateProject;
let deleteProject: typeof import("@/lib/project-store").deleteProject;
let addMilestone: typeof import("@/lib/project-store").addMilestone;
let updateMilestone: typeof import("@/lib/project-store").updateMilestone;
let deleteMilestone: typeof import("@/lib/project-store").deleteMilestone;
let addActivity: typeof import("@/lib/project-store").addActivity;
let seedInitialData: typeof import("@/lib/project-store").seedInitialData;

// Mock fs/promises
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

describe("Project Store Module", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/project-store");
    getAllProjects = mod.getAllProjects;
    getProjectById = mod.getProjectById;
    getProjectsByClient = mod.getProjectsByClient;
    getDashboardData = mod.getDashboardData;
    createProject = mod.createProject;
    updateProject = mod.updateProject;
    deleteProject = mod.deleteProject;
    addMilestone = mod.addMilestone;
    updateMilestone = mod.updateMilestone;
    deleteMilestone = mod.deleteMilestone;
    addActivity = mod.addActivity;
    seedInitialData = mod.seedInitialData;
  });

  const mockProjects: Project[] = [
    {
      id: "proj-001",
      clientId: "client-001",
      name: "Test Project 1",
      status: "active",
      progress: 50,
      budget: { allocated: 100000, spent: 50000 },
      schedule: {
        baselineEnd: "2025-06-01",
        currentEnd: "2025-06-15",
        daysVariance: 14,
      },
      milestones: [
        { id: "m1", title: "Phase 1", completed: true, dueDate: "2025-03-01" },
        { id: "m2", title: "Phase 2", completed: false, dueDate: "2025-04-01" },
      ],
      activity: [
        { id: "a1", timestamp: "2025-03-01T10:00:00Z", message: "Started", type: "note" },
      ],
      updatedAt: "2025-03-01T10:00:00Z",
    },
    {
      id: "proj-002",
      clientId: "client-001",
      name: "Test Project 2",
      status: "planning",
      progress: 0,
      budget: { allocated: 50000, spent: 0 },
      schedule: {
        baselineEnd: "2025-08-01",
        currentEnd: "2025-08-01",
        daysVariance: 0,
      },
      milestones: [],
      activity: [],
      updatedAt: "2025-03-01T10:00:00Z",
    },
    {
      id: "proj-003",
      clientId: "client-002",
      name: "Other Client Project",
      status: "completed",
      progress: 100,
      budget: { allocated: 75000, spent: 72000 },
      schedule: {
        baselineEnd: "2025-02-01",
        currentEnd: "2025-02-01",
        daysVariance: 0,
      },
      milestones: [
        { id: "m1", title: "Complete", completed: true, dueDate: "2025-02-01" },
      ],
      activity: [],
      updatedAt: "2025-02-01T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Project Retrieval", () => {
    it("should get all projects", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const projects = await getAllProjects();

      expect(projects).toHaveLength(3);
      expect(projects[0].id).toBe("proj-001");
    });

    it("should return empty array when file is empty", async () => {
      (fs.readFile as any).mockResolvedValue("");

      const projects = await getAllProjects();

      expect(projects).toEqual([]);
    });

    it("should get project by id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const project = await getProjectById("proj-001");

      expect(project).toBeDefined();
      expect(project?.name).toBe("Test Project 1");
    });

    it("should return null for non-existent project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const project = await getProjectById("non-existent");

      expect(project).toBeNull();
    });

    it("should get projects by client id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const projects = await getProjectsByClient("client-001");

      expect(projects).toHaveLength(2);
      expect(projects.every((p) => p.clientId === "client-001")).toBe(true);
    });

    it("should return empty array for client with no projects", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const projects = await getProjectsByClient("no-projects-client");

      expect(projects).toEqual([]);
    });
  });

  describe("Dashboard Data", () => {
    it("should calculate dashboard metrics correctly", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const dashboard = await getDashboardData("client-001");

      expect(dashboard.totalProjects).toBe(2);
      expect(dashboard.activeProjects).toBe(1);
      expect(dashboard.totalBudgetAllocated).toBe(150000);
      expect(dashboard.totalBudgetSpent).toBe(50000);
      expect(dashboard.currentProject).toBeDefined();
    });

    it("should prioritize active project as current project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const dashboard = await getDashboardData("client-001");

      expect(dashboard.currentProject?.status).toBe("active");
    });

    it("should handle client with no projects", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const dashboard = await getDashboardData("no-projects-client");

      expect(dashboard.totalProjects).toBe(0);
      expect(dashboard.activeProjects).toBe(0);
      expect(dashboard.totalBudgetAllocated).toBe(0);
      expect(dashboard.totalBudgetSpent).toBe(0);
      expect(dashboard.currentProject).toBeUndefined();
    });
  });

  describe("Project CRUD", () => {
    it("should create new project with generated id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const newProject = await createProject({
        name: "New Project",
        clientId: "client-001",
        status: "planning",
        progress: 0,
        budget: { allocated: 100000, spent: 0 },
        schedule: {
          baselineEnd: "2025-12-01",
          currentEnd: "2025-12-01",
          daysVariance: 0,
        },
        milestones: [],
        activity: [],
      });

      expect(newProject.id).toMatch(/^proj-\d+$/);
      expect(newProject.name).toBe("New Project");
      expect(newProject.updatedAt).toBeDefined();
    });

    it("should update project fields", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateProject("proj-001", {
        name: "Updated Project Name",
        progress: 75,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Project Name");
      expect(updated?.progress).toBe(75);
      expect(updated?.id).toBe("proj-001"); // ID should not change
    });

    it("should return null when updating non-existent project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const updated = await updateProject("non-existent", { name: "New Name" });

      expect(updated).toBeNull();
    });

    it("should delete project and return true on success", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const deleted = await deleteProject("proj-001");

      expect(deleted).toBe(true);
    });

    it("should return false when deleting non-existent project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const deleted = await deleteProject("non-existent");

      expect(deleted).toBe(false);
    });
  });

  describe("Milestone Management", () => {
    it("should add milestone to project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const milestone = await addMilestone("proj-001", {
        title: "New Milestone",
        completed: false,
        dueDate: "2025-05-01",
      });

      expect(milestone).toBeDefined();
      expect(milestone?.title).toBe("New Milestone");
      expect(milestone?.id).toMatch(/^m-\d+$/);
    });

    it("should return null when adding milestone to non-existent project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const milestone = await addMilestone("non-existent", {
        title: "New Milestone",
        completed: false,
        dueDate: "2025-05-01",
      });

      expect(milestone).toBeNull();
    });

    it("should update milestone and recalculate progress", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [mockProjects[0]] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateMilestone("proj-001", "m2", {
        completed: true,
      });

      expect(updated).toBeDefined();
      expect(updated?.completed).toBe(true);
    });

    it("should delete milestone from project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [mockProjects[0]] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const deleted = await deleteMilestone("proj-001", "m2");

      expect(deleted).toBe(true);
    });

    it("should return false when deleting non-existent milestone", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [mockProjects[0]] }));

      const deleted = await deleteMilestone("proj-001", "non-existent");

      expect(deleted).toBe(false);
    });
  });

  describe("Activity Tracking", () => {
    it("should add activity to project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [mockProjects[0]] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const activity = await addActivity("proj-001", {
        message: "New activity message",
        type: "note",
      });

      expect(activity).toBeDefined();
      expect(activity?.message).toBe("New activity message");
      expect(activity?.id).toMatch(/^a-\d+$/);
      expect(activity?.timestamp).toBeDefined();
    });

    it("should prepend activity to project activity list", async () => {
      const projectWithActivity = { ...mockProjects[0] };
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [projectWithActivity] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      await addActivity("proj-001", {
        message: "Newest Activity",
        type: "milestone",
      });

      // Verify write was called with activity at beginning
      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      expect(writtenData.projects[0].activity[0].message).toBe("Newest Activity");
    });

    it("should return null when adding activity to non-existent project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: mockProjects }));

      const activity = await addActivity("non-existent", {
        message: "Test",
        type: "note",
      });

      expect(activity).toBeNull();
    });

    it("should support all activity types", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [mockProjects[0]] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const types: Activity["type"][] = ["milestone", "document", "note", "budget"];

      for (const type of types) {
        const activity = await addActivity("proj-001", {
          message: `Activity of type ${type}`,
          type,
        });

        expect(activity?.type).toBe(type);
      }
    });
  });

  describe("Progress Calculation", () => {
    it("should recalculate progress when milestone is updated", async () => {
      const project = {
        ...mockProjects[0],
        milestones: [
          { id: "m1", title: "M1", completed: false, dueDate: "2025-01-01" },
          { id: "m2", title: "M2", completed: false, dueDate: "2025-02-01" },
          { id: "m3", title: "M3", completed: false, dueDate: "2025-03-01" },
          { id: "m4", title: "M4", completed: false, dueDate: "2025-04-01" },
        ],
        progress: 0,
      };

      let persisted = JSON.stringify({ projects: [project] });
      (fs.readFile as any).mockImplementation(async () => persisted);
      (fs.writeFile as any).mockImplementation(async (_path: string, data: string) => {
        persisted = data;
      });

      // Complete 2 out of 4 milestones
      await updateMilestone("proj-001", "m1", { completed: true });
      await updateMilestone("proj-001", "m2", { completed: true });

      const writeCall = (fs.writeFile as any).mock.calls[1];
      const writtenData = JSON.parse(writeCall[1]);
      expect(writtenData.projects[0].progress).toBe(50);
    });

    it("should handle project with no milestones", async () => {
      const project = {
        ...mockProjects[0],
        milestones: [],
        progress: 0,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify({ projects: [project] }));

      // This should not throw
      await expect(addMilestone("proj-001", {
        title: "First Milestone",
        completed: false,
        dueDate: "2025-01-01",
      })).resolves.toBeDefined();
    });
  });

  describe("Seed Data", () => {
    it("should seed initial data correctly", async () => {
      (fs.readFile as any).mockRejectedValue(new Error("File not found"));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const projects = await seedInitialData();

      expect(projects).toHaveLength(3);
      expect(projects[0].id).toBe("proj-001");
      expect(projects[0].milestones.length).toBeGreaterThan(0);
    });
  });
});
