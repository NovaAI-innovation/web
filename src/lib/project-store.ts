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
  return projects.filter((p) => p.clientId === clientId);
}

export async function getDashboardData(clientId: string) {
  const projects = await getProjectsByClient(clientId);

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

// --- Write helpers (bypass cache) ---

async function readProjectsRaw(): Promise<ProjectsFile> {
  await ensureFile();
  const raw = await readFile(resolveProjectsPath(), "utf-8");
  return raw ? (JSON.parse(raw) as ProjectsFile) : defaultProjectsFile;
}

async function writeProjectsRaw(data: ProjectsFile): Promise<void> {
  await writeFile(resolveProjectsPath(), JSON.stringify(data, null, 2), "utf-8");
  revalidateTag("projects", "max");
}

// --- CRUD ---

export async function createProject(
  input: Omit<Project, "id" | "updatedAt"> & { clientId?: string },
): Promise<Project> {
  const data = await readProjectsRaw();
  const project: Project = {
    ...input,
    id: `proj-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  data.projects.push(project);
  await writeProjectsRaw(data);
  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id">>,
): Promise<Project | null> {
  const data = await readProjectsRaw();
  const index = data.projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  data.projects[index] = {
    ...data.projects[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectsRaw(data);
  return data.projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const data = await readProjectsRaw();
  const before = data.projects.length;
  data.projects = data.projects.filter((p) => p.id !== id);
  if (data.projects.length === before) return false;
  await writeProjectsRaw(data);
  return true;
}

export async function addMilestone(
  projectId: string,
  input: Omit<Milestone, "id">,
): Promise<Milestone | null> {
  const data = await readProjectsRaw();
  const index = data.projects.findIndex((p) => p.id === projectId);
  if (index === -1) return null;
  const milestone: Milestone = { ...input, id: `m-${Date.now()}` };
  data.projects[index].milestones.push(milestone);
  data.projects[index].updatedAt = new Date().toISOString();
  await writeProjectsRaw(data);
  return milestone;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  updates: Partial<Omit<Milestone, "id">>,
): Promise<Milestone | null> {
  const data = await readProjectsRaw();
  const pi = data.projects.findIndex((p) => p.id === projectId);
  if (pi === -1) return null;
  const mi = data.projects[pi].milestones.findIndex((m) => m.id === milestoneId);
  if (mi === -1) return null;
  data.projects[pi].milestones[mi] = { ...data.projects[pi].milestones[mi], ...updates };
  data.projects[pi].updatedAt = new Date().toISOString();
  // Recalculate progress
  const milestones = data.projects[pi].milestones;
  if (milestones.length > 0) {
    data.projects[pi].progress = Math.round(
      (milestones.filter((m) => m.completed).length / milestones.length) * 100,
    );
  }
  await writeProjectsRaw(data);
  return data.projects[pi].milestones[mi];
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<boolean> {
  const data = await readProjectsRaw();
  const pi = data.projects.findIndex((p) => p.id === projectId);
  if (pi === -1) return false;
  const before = data.projects[pi].milestones.length;
  data.projects[pi].milestones = data.projects[pi].milestones.filter((m) => m.id !== milestoneId);
  if (data.projects[pi].milestones.length === before) return false;
  data.projects[pi].updatedAt = new Date().toISOString();
  await writeProjectsRaw(data);
  return true;
}

export async function addActivity(
  projectId: string,
  input: Omit<Activity, "id" | "timestamp">,
): Promise<Activity | null> {
  const data = await readProjectsRaw();
  const index = data.projects.findIndex((p) => p.id === projectId);
  if (index === -1) return null;
  const activity: Activity = {
    ...input,
    id: `a-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  data.projects[index].activity.unshift(activity);
  data.projects[index].updatedAt = new Date().toISOString();
  await writeProjectsRaw(data);
  return activity;
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
