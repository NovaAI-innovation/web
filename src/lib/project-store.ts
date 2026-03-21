import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { revalidateTag, unstable_cache } from "next/cache";

export type ProjectStatus = "active" | "planning" | "completed";

export type Milestone = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  weight?: number;
};

export type Activity = {
  id: string;
  timestamp: string;
  message: string;
  type: "milestone" | "document" | "note" | "budget";
};

export type Project = {
  id: string;
  clientId?: string;
  name: string;
  status: ProjectStatus;
  progress: number; // 0-100 (aggregated)
  budget: {
    allocated: number;
    spent: number;
  };
  schedule: {
    baselineEnd: string;
    currentEnd: string;
    daysVariance: number;
  };
  milestones: Milestone[];
  activity: Activity[];
  updatedAt: string;
};

type ProjectsFile = {
  projects: Project[];
};

const defaultProjectsFile: ProjectsFile = { projects: [] };

function resolveProjectsPath(): string {
  return resolve(join(process.cwd(), ".data", "projects.json"));
}

async function ensureFile(): Promise<void> {
  const filePath = resolveProjectsPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultProjectsFile, null, 2), "utf-8");
  }
}

export async function getAllProjects(): Promise<Project[]> {
  const cached = unstable_cache(
    async () => {
      await ensureFile();
      const filePath = resolveProjectsPath();
      const raw = await readFile(filePath, "utf-8");
      const parsed = raw ? (JSON.parse(raw) as ProjectsFile) : defaultProjectsFile;
      return parsed.projects;
    },
    ["projects-all"],
    { revalidate: 120, tags: ["projects"] },
  );

  return cached();
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getAllProjects();
  return projects.find((p) => p.id === id) ?? null;
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const projects = await getAllProjects();
  // Return projects assigned to this client, or unassigned projects (legacy data)
  return projects.filter((p) => p.clientId === clientId || !p.clientId);
}

export async function getDashboardData() {
  const projects = await getAllProjects();

  // For now, return the first active project as "current" + summary stats
  const activeProject = projects.find((p) => p.status === "active") || projects[0];

  return {
    currentProject: activeProject,
    allProjects: projects,
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "active").length,
    totalBudgetAllocated: projects.reduce((sum, p) => sum + p.budget.allocated, 0),
    totalBudgetSpent: projects.reduce((sum, p) => sum + p.budget.spent, 0),
  };
}

export async function seedInitialData() {
  await ensureFile();
  const filePath = resolveProjectsPath();

  const initialData: ProjectsFile = {
    projects: [
      {
        id: "proj-001",
        name: "Thompson Residence Renovation",
        status: "active",
        progress: 73,
        budget: { allocated: 245000, spent: 178000 },
        schedule: {
          baselineEnd: "2025-05-15",
          currentEnd: "2025-05-28",
          daysVariance: 13
        },
        milestones: [
          { id: "m1", title: "Demolition Complete", completed: true, dueDate: "2025-02-10" },
          { id: "m2", title: "Structural Framing", completed: true, dueDate: "2025-03-05" },
          { id: "m3", title: "Kitchen Cabinet Installation", completed: false, dueDate: "2025-04-20" },
          { id: "m4", title: "Interior Finishing", completed: false, dueDate: "2025-05-10" },
        ],
        activity: [
          { id: "a1", timestamp: "2025-03-18T10:30:00Z", message: "Kitchen materials delivered", type: "document" },
          { id: "a2", timestamp: "2025-03-17T14:15:00Z", message: "Updated project timeline", type: "note" },
          { id: "a3", timestamp: "2025-03-16T09:00:00Z", message: "Framing milestone completed", type: "milestone" },
        ],
        updatedAt: "2025-03-18T16:45:00Z"
      },
      {
        id: "proj-002",
        name: "Guest House Addition",
        status: "planning",
        progress: 25,
        budget: { allocated: 135000, spent: 18500 },
        schedule: {
          baselineEnd: "2025-08-10",
          currentEnd: "2025-08-10",
          daysVariance: 0
        },
        milestones: [
          { id: "m1", title: "Design Approval", completed: true, dueDate: "2025-02-28" },
          { id: "m2", title: "Permit Submission", completed: false, dueDate: "2025-04-05" },
        ],
        activity: [
          { id: "a1", timestamp: "2025-03-15T11:20:00Z", message: "Architect revisions received", type: "note" },
        ],
        updatedAt: "2025-03-15T11:20:00Z"
      },
      {
        id: "proj-003",
        name: "Downtown Commercial Fit-Out",
        status: "active",
        progress: 45,
        budget: { allocated: 425000, spent: 198000 },
        schedule: {
          baselineEnd: "2025-06-30",
          currentEnd: "2025-07-15",
          daysVariance: 15
        },
        milestones: [
          { id: "m1", title: "Site Preparation", completed: true, dueDate: "2025-02-20" },
          { id: "m2", title: "Electrical Rough-in", completed: true, dueDate: "2025-03-10" },
          { id: "m3", title: "HVAC Installation", completed: false, dueDate: "2025-04-25" },
        ],
        activity: [],
        updatedAt: "2025-03-12T08:00:00Z"
      }
    ]
  };

  await writeFile(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  revalidateTag("projects", "max");
  return initialData.projects;
}
