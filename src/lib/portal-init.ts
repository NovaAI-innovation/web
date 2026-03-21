import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { revalidateTag } from "next/cache";

/**
 * Initialize portal data for a newly registered client.
 * Seeds demo projects, invoices, and a welcome message
 * so the portal is populated on first login.
 */
export async function initializePortalForClient(client: {
  id: string;
  name: string;
}) {
  const now = new Date().toISOString();
  const firstName = client.name.split(" ")[0];

  // Seed projects if file doesn't exist yet
  await seedFileIfEmpty(
    resolve(join(process.cwd(), ".data", "projects.json")),
    () => ({
      projects: [
        {
          id: "proj-001",
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
        },
      ],
    }),
  );

  // Seed invoices if file doesn't exist yet
  await seedFileIfEmpty(
    resolve(join(process.cwd(), ".data", "invoices.json")),
    () => ({
      invoices: [
        {
          id: "inv-001",
          clientId: client.id,
          number: "INV-2026-001",
          projectId: "proj-001",
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
        },
      ],
    }),
  );

  // Seed welcome message if file doesn't exist yet
  await seedFileIfEmpty(
    resolve(join(process.cwd(), ".data", "portal-messages.json")),
    () => ({
      messages: [
        {
          id: "msg-welcome",
          author: "pm",
          body: `Welcome to Chimera, ${firstName}! Your client portal is ready. Here you can track your project progress, view documents, manage invoices, and message our team directly. We're excited to get started on your project.`,
          createdAt: now,
          readByClient: false,
        },
        {
          id: "msg-intro",
          author: "system",
          body: "Your project manager Casey Thompson has been assigned to your project. You'll receive updates here as milestones are reached.",
          createdAt: now,
          readByClient: false,
        },
      ],
    }),
  );

  // Revalidate all caches so pages pick up seeded data
  try {
    revalidateTag("projects", "max");
    revalidateTag("invoices", "max");
    revalidateTag("portal-messages", "max");
  } catch {
    // revalidateTag may throw outside of request context during build
  }
}

async function seedFileIfEmpty(filePath: string, getData: () => unknown): Promise<void> {
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    const existing = await readFile(filePath, "utf-8");
    // File exists — don't overwrite
    if (existing && existing.trim().length > 2) return;
  } catch {
    // File doesn't exist — seed it
  }

  await writeFile(filePath, JSON.stringify(getData(), null, 2), "utf-8");
}
