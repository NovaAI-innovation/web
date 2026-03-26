/**
 * One-time migration: flat JSON stores → PostgreSQL.
 *
 * Run AFTER seeding roles: npm run db:migrate-json
 *
 * Safety:
 *   - Skips rows that already exist (idempotent on re-run)
 *   - Does NOT delete .data/ files — keep them as backup for 1 sprint
 *   - Existing clients get emailVerifiedAt = createdAt (grandfather clause)
 *   - Legacy SHA-256 hashes are stored with legacySalt; bcrypt upgrade happens at next login
 */
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = resolve(join(process.cwd(), ".data"));

// ─── JSON store types (mirrors old store files) ───────────────────────────────

type OldClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  notificationPrefs?: {
    email: boolean;
    messages: boolean;
    milestones: boolean;
    budget: boolean;
  };
};

type OldMilestone = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  weight?: number;
};

type OldActivity = {
  id: string;
  timestamp: string;
  message: string;
  type: string;
};

type OldProject = {
  id: string;
  clientId?: string;
  name: string;
  status: string;
  progress: number;
  budget: { allocated: number; spent: number };
  schedule: { baselineEnd?: string; currentEnd?: string; daysVariance: number };
  milestones: OldMilestone[];
  activity: OldActivity[];
  updatedAt: string;
};

type OldInvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type OldInvoice = {
  id: string;
  clientId?: string;
  number: string;
  projectId: string;
  projectName: string;
  status: string;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: OldInvoiceLineItem[];
  isFinalInvoice?: boolean;
};

type OldMessage = {
  id: string;
  clientId: string;
  author: string;
  body: string;
  reasoning?: string;
  createdAt: string;
  readByClient: boolean;
  attachment?: { filename: string; originalName: string; size: number };
};

type OldMemoryEntry = {
  id: string;
  clientId: string;
  query: string;
  responseSummary: string;
  artifactRefs: string[];
  createdAt: string;
};

type OldLead = {
  leadId: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  projectType: string;
  timeline: string;
  budgetBand: string;
  source: string;
  message: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(resolve(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    console.log(`  ℹ  ${filename} not found — skipping`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting JSON → PostgreSQL migration…\n");

  // Resolve role IDs
  const clientRole = await prisma.role.findUniqueOrThrow({ where: { name: "client" } });

  // ── 1. Clients → users ──────────────────────────────────────────────────────
  const clientFile = await readJson<{ clients: OldClient[] }>("clients.json");
  if (clientFile) {
    console.log(`Migrating ${clientFile.clients.length} clients…`);
    for (const c of clientFile.clients) {
      const existing = await prisma.user.findUnique({ where: { id: c.id } });
      if (existing) { console.log(`  skip ${c.email} (exists)`); continue; }

      await prisma.user.create({
        data: {
          id: c.id,
          name: c.name,
          email: c.email.toLowerCase(),
          phone: c.phone,
          passwordHash: c.passwordHash,
          legacySalt: c.salt,  // SHA-256 salt — will be upgraded to bcrypt on next login
          roleId: clientRole.id,
          emailVerifiedAt: new Date(c.createdAt), // grandfather: treat existing accounts as verified
          createdAt: new Date(c.createdAt),
        },
      });

      await prisma.notificationPreference.upsert({
        where: { userId: c.id },
        update: {},
        create: {
          userId: c.id,
          emailMessages: c.notificationPrefs?.messages ?? true,
          emailMilestones: c.notificationPrefs?.milestones ?? true,
          emailBudget: c.notificationPrefs?.budget ?? false,
        },
      });

      console.log(`  ✓ ${c.email}`);
    }
  }

  // ── 2. Projects → projects + milestones + project_activity ──────────────────
  const projectFile = await readJson<{ projects: OldProject[] }>("projects.json");
  if (projectFile) {
    console.log(`\nMigrating ${projectFile.projects.length} projects…`);
    for (const p of projectFile.projects) {
      const existing = await prisma.project.findUnique({ where: { id: p.id } });
      if (existing) { console.log(`  skip project ${p.id} (exists)`); continue; }

      if (!p.clientId) { console.log(`  skip project ${p.id} (no clientId)`); continue; }

      const client = await prisma.user.findUnique({ where: { id: p.clientId } });
      if (!client) { console.log(`  skip project ${p.id} (client not found)`); continue; }

      await prisma.project.create({
        data: {
          id: p.id,
          clientId: p.clientId,
          name: p.name,
          status: p.status,
          progress: p.progress,
          budgetAllocated: p.budget.allocated,
          budgetSpent: p.budget.spent,
          baselineEnd: p.schedule.baselineEnd ? new Date(p.schedule.baselineEnd) : null,
          currentEnd: p.schedule.currentEnd ? new Date(p.schedule.currentEnd) : null,
          daysVariance: p.schedule.daysVariance,
          createdAt: new Date(p.updatedAt),
          milestones: {
            create: p.milestones.map((m) => ({
              id: m.id,
              title: m.title,
              completed: m.completed,
              dueDate: m.dueDate ? new Date(m.dueDate) : null,
              weight: m.weight ?? 1,
            })),
          },
          activity: {
            create: p.activity.map((a) => ({
              id: a.id,
              type: a.type,
              message: a.message,
              createdAt: new Date(a.timestamp),
            })),
          },
        },
      });
      console.log(`  ✓ project: ${p.name}`);
    }
  }

  // ── 3. Invoices → invoices + invoice_line_items ──────────────────────────────
  const invoiceFile = await readJson<{ invoices: OldInvoice[] }>("invoices.json");
  if (invoiceFile) {
    console.log(`\nMigrating ${invoiceFile.invoices.length} invoices…`);
    for (const inv of invoiceFile.invoices) {
      const existing = await prisma.invoice.findUnique({ where: { id: inv.id } });
      if (existing) { console.log(`  skip invoice ${inv.number} (exists)`); continue; }

      if (!inv.clientId) { console.log(`  skip invoice ${inv.number} (no clientId)`); continue; }

      const client = await prisma.user.findUnique({ where: { id: inv.clientId } });
      const project = await prisma.project.findUnique({ where: { id: inv.projectId } });
      if (!client || !project) { console.log(`  skip invoice ${inv.number} (client or project not found)`); continue; }

      await prisma.invoice.create({
        data: {
          id: inv.id,
          clientId: inv.clientId,
          projectId: inv.projectId,
          number: inv.number,
          status: inv.status,
          issuedDate: new Date(inv.issuedDate),
          dueDate: new Date(inv.dueDate),
          paidDate: inv.paidDate ? new Date(inv.paidDate) : null,
          subtotal: inv.subtotal,
          tax: inv.tax,
          total: inv.total,
          isFinalInvoice: inv.isFinalInvoice ?? false,
          lineItems: {
            create: inv.lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              total: li.total,
            })),
          },
        },
      });
      console.log(`  ✓ invoice: ${inv.number}`);
    }
  }

  // ── 4. Portal messages ───────────────────────────────────────────────────────
  const msgFile = await readJson<{ messages: OldMessage[] }>("portal-messages.json");
  if (msgFile) {
    console.log(`\nMigrating ${msgFile.messages.length} portal messages…`);
    for (const m of msgFile.messages) {
      const existing = await prisma.portalMessage.findUnique({ where: { id: m.id } });
      if (existing) continue;

      const client = await prisma.user.findUnique({ where: { id: m.clientId } });
      if (!client) continue;

      await prisma.portalMessage.create({
        data: {
          id: m.id,
          clientId: m.clientId,
          author: m.author,
          body: m.body,
          reasoning: m.reasoning,
          readByClient: m.readByClient,
          attachmentFilename: m.attachment?.filename,
          attachmentOriginalName: m.attachment?.originalName,
          attachmentSize: m.attachment?.size,
          createdAt: new Date(m.createdAt),
        },
      });
    }
    console.log(`  ✓ portal messages migrated`);
  }

  // ── 5. Agent memory ──────────────────────────────────────────────────────────
  const memFile = await readJson<{ entries: OldMemoryEntry[] }>("portal-agent-memory.json");
  if (memFile) {
    console.log(`\nMigrating ${memFile.entries.length} agent memory entries…`);
    for (const entry of memFile.entries) {
      const existing = await prisma.portalAgentMemory.findUnique({ where: { id: entry.id } });
      if (existing) continue;

      const client = await prisma.user.findUnique({ where: { id: entry.clientId } });
      if (!client) continue;

      await prisma.portalAgentMemory.create({
        data: {
          id: entry.id,
          clientId: entry.clientId,
          query: entry.query,
          responseSummary: entry.responseSummary,
          artifactRefs: entry.artifactRefs,
          createdAt: new Date(entry.createdAt),
        },
      });
    }
    console.log(`  ✓ agent memory migrated`);
  }

  // ── 6. Leads ─────────────────────────────────────────────────────────────────
  const leadFile = await readJson<{ leads: OldLead[] }>("leads.json");
  if (leadFile) {
    console.log(`\nMigrating ${leadFile.leads.length} leads…`);
    for (const lead of leadFile.leads) {
      const existing = await prisma.lead.findUnique({ where: { id: lead.leadId } });
      if (existing) continue;

      await prisma.lead.create({
        data: {
          id: lead.leadId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          projectType: lead.projectType,
          timeline: lead.timeline,
          budget: lead.budgetBand,
          source: lead.source,
          message: lead.message,
          createdAt: new Date(lead.createdAt),
        },
      });
    }
    console.log(`  ✓ leads migrated`);
  }

  console.log("\nMigration complete. Keep .data/ as read-only backup for 1 sprint.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
