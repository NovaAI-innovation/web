import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { revalidateTag } from "next/cache";

/**
 * Initialize portal data for a newly registered client.
 * Always seeds per-client data, even if the data files already exist
 * from previous clients. Safe to call multiple times — skips if the
 * client already has data.
 */
export async function initializePortalForClient(client: {
  id: string;
  name: string;
}) {
  const now = new Date().toISOString();
  const firstName = client.name.split(" ")[0];

  const projectsPath = resolve(join(process.cwd(), ".data", "projects.json"));
  const invoicesPath = resolve(join(process.cwd(), ".data", "invoices.json"));
  const messagesPath = resolve(join(process.cwd(), ".data", "portal-messages.json"));

  await ensureDir(projectsPath);

  // --- Seed projects for this client ---
  const projectsData = await readJsonFile<{ projects: Array<Record<string, unknown>> }>(
    projectsPath,
    { projects: [] },
  );
  const alreadyHasProjects = projectsData.projects.some(
    (p) => (p.clientId as string | undefined) === client.id,
  );
  if (!alreadyHasProjects) {
    projectsData.projects.push({
      id: `proj-${client.id.slice(-8)}`,
      clientId: client.id,
      name: `${client.name} Residence Renovation`,
      status: "active",
      progress: 12,
      budget: { allocated: 245000, spent: 29400 },
      schedule: {
        baselineEnd: "2026-08-15",
        currentEnd: "2026-08-15",
        daysVariance: 0,
      },
      milestones: [
        { id: "m1", title: "Design Approval", completed: true, dueDate: "2026-04-01" },
        { id: "m2", title: "Permit Submission", completed: false, dueDate: "2026-04-20" },
        { id: "m3", title: "Demolition & Site Prep", completed: false, dueDate: "2026-05-15" },
        { id: "m4", title: "Structural Framing", completed: false, dueDate: "2026-06-10" },
        { id: "m5", title: "Interior Finishing", completed: false, dueDate: "2026-08-01" },
      ],
      activity: [
        { id: "a1", timestamp: now, message: "Project created — welcome to Chimera!", type: "note" },
        { id: "a2", timestamp: now, message: "Design approval milestone completed", type: "milestone" },
      ],
      updatedAt: now,
    });
    await writeJsonFile(projectsPath, projectsData);
  }

  // --- Seed invoices for this client ---
  const invoicesData = await readJsonFile<{ invoices: Array<Record<string, unknown>> }>(
    invoicesPath,
    { invoices: [] },
  );
  const alreadyHasInvoices = invoicesData.invoices.some(
    (i) => (i.clientId as string | undefined) === client.id,
  );
  if (!alreadyHasInvoices) {
    const projectId = `proj-${client.id.slice(-8)}`;
    invoicesData.invoices.push({
      id: `inv-${client.id.slice(-8)}`,
      clientId: client.id,
      number: `INV-2026-${String(invoicesData.invoices.length + 1).padStart(3, "0")}`,
      projectId,
      projectName: `${client.name} Residence Renovation`,
      status: "pending",
      issuedDate: "2026-03-21",
      dueDate: "2026-04-21",
      subtotal: 28000,
      tax: 1400,
      total: 29400,
      lineItems: [
        { description: "Architectural Design", quantity: 1, unitPrice: 16000, total: 16000 },
        { description: "Permit Application Fees", quantity: 1, unitPrice: 3500, total: 3500 },
        { description: "Survey & Site Analysis", quantity: 1, unitPrice: 4500, total: 4500 },
        { description: "Project Management Setup", quantity: 1, unitPrice: 4000, total: 4000 },
      ],
    });
    await writeJsonFile(invoicesPath, invoicesData);
  }

  // --- Seed welcome messages for this client ---
  const messagesData = await readJsonFile<{ messages: Array<Record<string, unknown>> }>(
    messagesPath,
    { messages: [] },
  );
  const alreadyHasMessages = messagesData.messages.some(
    (m) => (m.clientId as string | undefined) === client.id,
  );
  if (!alreadyHasMessages) {
    messagesData.messages.push(
      {
        id: `msg-welcome-${client.id.slice(-8)}`,
        clientId: client.id,
        author: "pm",
        body: `Welcome to Chimera, ${firstName}! Your client portal is ready. Here you can track your project progress, view documents, manage invoices, and message our team directly. We're excited to get started on your project.`,
        createdAt: now,
        readByClient: false,
      },
      {
        id: `msg-intro-${client.id.slice(-8)}`,
        clientId: client.id,
        author: "system",
        body: "Your project manager has been assigned to your project. You'll receive updates here as milestones are reached.",
        createdAt: now,
        readByClient: false,
      },
    );
    await writeJsonFile(messagesPath, messagesData);
  }

  try {
    revalidateTag("projects", "max");
    revalidateTag("invoices", "max");
    revalidateTag("portal-messages", "max");
  } catch {
    // revalidateTag may throw outside request context during build
  }
}

// --- Helpers ---

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return raw && raw.trim().length > 2 ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
