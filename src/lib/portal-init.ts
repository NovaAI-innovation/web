/**
 * Initialize portal data for a newly registered client.
 *
 * Seeds demo project, invoice, and welcome messages in PostgreSQL.
 * Idempotent — safe to call multiple times (skips if data already exists).
 */
import { prisma } from "@/lib/prisma";

export async function initializePortalForClient(client: { id: string; name: string }) {
  const firstName = client.name.split(" ")[0] ?? client.name;
  const now = new Date();

  // Skip if already seeded
  const existingProject = await prisma.project.findFirst({ where: { clientId: client.id } });
  if (existingProject) return;

  // ── Demo project ────────────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      name: `${client.name} Residence Renovation`,
      status: "active",
      progress: 12,
      budgetAllocated: 245000,
      budgetSpent: 29400,
      baselineEnd: new Date("2026-08-15"),
      currentEnd: new Date("2026-08-15"),
      daysVariance: 0,
      milestones: {
        create: [
          { title: "Design Approval",          completed: true,  dueDate: new Date("2026-04-01"), weight: 1 },
          { title: "Permit Submission",         completed: false, dueDate: new Date("2026-04-20"), weight: 1 },
          { title: "Demolition & Site Prep",    completed: false, dueDate: new Date("2026-05-15"), weight: 2 },
          { title: "Structural Framing",        completed: false, dueDate: new Date("2026-06-10"), weight: 3 },
          { title: "Interior Finishing",        completed: false, dueDate: new Date("2026-08-01"), weight: 3 },
        ],
      },
      activity: {
        create: [
          { type: "note",      message: "Project created — welcome to Chimera!",  createdAt: now },
          { type: "milestone", message: "Design approval milestone completed",     createdAt: now },
        ],
      },
    },
  });

  // ── Demo invoice ────────────────────────────────────────────────────────────
  const invoiceCount = await prisma.invoice.count();
  await prisma.invoice.create({
    data: {
      clientId: client.id,
      projectId: project.id,
      number: `INV-2026-${String(invoiceCount + 1).padStart(3, "0")}`,
      status: "pending",
      issuedDate: new Date("2026-03-21"),
      dueDate: new Date("2026-04-21"),
      subtotal: 28000,
      tax: 1400,
      total: 29400,
      lineItems: {
        create: [
          { description: "Architectural Design",    quantity: 1, unitPrice: 16000, total: 16000 },
          { description: "Permit Application Fees", quantity: 1, unitPrice: 3500,  total: 3500  },
          { description: "Survey & Site Analysis",  quantity: 1, unitPrice: 4500,  total: 4500  },
          { description: "Project Management Setup",quantity: 1, unitPrice: 4000,  total: 4000  },
        ],
      },
    },
  });

  // ── Welcome messages ────────────────────────────────────────────────────────
  await prisma.portalMessage.createMany({
    data: [
      {
        clientId: client.id,
        author: "pm",
        body: `Welcome to Chimera, ${firstName}! Your client portal is ready. Here you can track your project progress, view documents, manage invoices, and message our team directly. We're excited to get started on your project.`,
        readByClient: false,
        createdAt: now,
      },
      {
        clientId: client.id,
        author: "system",
        body: "Your project manager has been assigned to your project. You'll receive updates here as milestones are reached.",
        readByClient: false,
        createdAt: now,
      },
    ],
  });
}
