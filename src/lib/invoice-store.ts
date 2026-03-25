import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { revalidateTag, unstable_cache } from "next/cache";

export type InvoiceStatus = "paid" | "pending" | "overdue";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Invoice = {
  id: string;
  clientId?: string;
  number: string;
  projectId: string;
  projectName: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: InvoiceLineItem[];
  isFinalInvoice?: boolean;
};

type InvoicesFile = {
  invoices: Invoice[];
};

const defaultInvoicesFile: InvoicesFile = { invoices: [] };

function resolveInvoicesPath(): string {
  return resolve(join(process.cwd(), ".data", "invoices.json"));
}

async function ensureFile(): Promise<void> {
  const filePath = resolveInvoicesPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    // Seed with initial data on first access
    await writeFile(filePath, JSON.stringify(getSeedData(), null, 2), "utf-8");
  }
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const cached = unstable_cache(
    async () => {
      await ensureFile();
      const filePath = resolveInvoicesPath();
      const raw = await readFile(filePath, "utf-8");
      const parsed = raw ? (JSON.parse(raw) as InvoicesFile) : defaultInvoicesFile;
      return parsed.invoices;
    },
    ["invoices-all"],
    { revalidate: 120, tags: ["invoices"] },
  );

  return cached();
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  return invoices.find((inv) => inv.id === id) ?? null;
}

export async function getInvoicesByProject(projectId: string): Promise<Invoice[]> {
  const invoices = await getAllInvoices();
  return invoices.filter((inv) => inv.projectId === projectId);
}

export async function getInvoicesByClient(clientId: string): Promise<Invoice[]> {
  const invoices = await getAllInvoices();
  return invoices.filter((inv) => inv.clientId === clientId);
}

export async function hasProjectUnpaidBalance(projectId: string): Promise<boolean> {
  const invoices = await getInvoicesByProject(projectId);
  return invoices.some((inv) => inv.status !== 'paid');
}

export async function getInvoiceSummaryByClient(clientId: string) {
  const invoices = await getInvoicesByClient(clientId);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);

  return {
    invoices,
    totalInvoices: invoices.length,
    totalOutstanding,
    totalPaid,
    overdueCount: invoices.filter((i) => i.status === "overdue").length,
    pendingCount: invoices.filter((i) => i.status === "pending").length,
    paidCount: invoices.filter((i) => i.status === "paid").length,
  };
}


// --- Write helpers (bypass cache) ---

async function readInvoicesRaw(): Promise<InvoicesFile> {
  await ensureFile();
  const raw = await readFile(resolveInvoicesPath(), "utf-8");
  return raw ? (JSON.parse(raw) as InvoicesFile) : defaultInvoicesFile;
}

async function writeInvoicesRaw(data: InvoicesFile): Promise<void> {
  await writeFile(resolveInvoicesPath(), JSON.stringify(data, null, 2), "utf-8");
  revalidateTag("invoices", "max");
}

// --- CRUD ---

export async function createInvoice(
  input: Omit<Invoice, "id">,
): Promise<Invoice> {
  const data = await readInvoicesRaw();
  const invoice: Invoice = { ...input, id: `inv-${Date.now()}` };
  data.invoices.push(invoice);
  await writeInvoicesRaw(data);
  return invoice;
}

export async function updateInvoice(
  id: string,
  updates: Partial<Omit<Invoice, "id">>,
): Promise<Invoice | null> {
  const data = await readInvoicesRaw();
  const index = data.invoices.findIndex((i) => i.id === id);
  if (index === -1) return null;
  data.invoices[index] = { ...data.invoices[index], ...updates, id };
  await writeInvoicesRaw(data);
  return data.invoices[index];
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const data = await readInvoicesRaw();
  const before = data.invoices.length;
  data.invoices = data.invoices.filter((i) => i.id !== id);
  if (data.invoices.length === before) return false;
  await writeInvoicesRaw(data);
  return true;
}

function getSeedData(): InvoicesFile {
  return {
    invoices: [
      {
        id: "inv-001",
        number: "INV-2025-001",
        projectId: "proj-001",
        projectName: "Thompson Residence Renovation",
        status: "paid",
        issuedDate: "2025-01-15",
        dueDate: "2025-02-15",
        paidDate: "2025-02-10",
        subtotal: 45000,
        tax: 2250,
        total: 47250,
        lineItems: [
          { description: "Demolition & Site Prep", quantity: 1, unitPrice: 15000, total: 15000 },
          { description: "Structural Engineering", quantity: 1, unitPrice: 8000, total: 8000 },
          { description: "Framing Materials", quantity: 1, unitPrice: 12000, total: 12000 },
          { description: "Labor - Phase 1", quantity: 200, unitPrice: 50, total: 10000 },
        ],
      },
      {
        id: "inv-002",
        number: "INV-2025-002",
        projectId: "proj-001",
        projectName: "Thompson Residence Renovation",
        status: "paid",
        issuedDate: "2025-02-20",
        dueDate: "2025-03-20",
        paidDate: "2025-03-15",
        subtotal: 62000,
        tax: 3100,
        total: 65100,
        lineItems: [
          { description: "Kitchen Cabinetry", quantity: 1, unitPrice: 22000, total: 22000 },
          { description: "Plumbing Rough-in", quantity: 1, unitPrice: 9500, total: 9500 },
          { description: "Electrical Rough-in", quantity: 1, unitPrice: 11500, total: 11500 },
          { description: "Labor - Phase 2", quantity: 380, unitPrice: 50, total: 19000 },
        ],
      },
      {
        id: "inv-003",
        number: "INV-2025-003",
        projectId: "proj-001",
        projectName: "Thompson Residence Renovation",
        status: "pending",
        issuedDate: "2025-03-18",
        dueDate: "2025-04-18",
        subtotal: 58000,
        tax: 2900,
        total: 60900,
        lineItems: [
          { description: "Countertops & Backsplash", quantity: 1, unitPrice: 14000, total: 14000 },
          { description: "Flooring - Hardwood", quantity: 850, unitPrice: 18, total: 15300 },
          { description: "Interior Paint & Finish", quantity: 1, unitPrice: 8700, total: 8700 },
          { description: "Labor - Phase 3", quantity: 400, unitPrice: 50, total: 20000 },
        ],
      },
      {
        id: "inv-004",
        number: "INV-2025-004",
        projectId: "proj-002",
        projectName: "Guest House Addition",
        status: "pending",
        issuedDate: "2025-03-01",
        dueDate: "2025-04-01",
        subtotal: 18500,
        tax: 925,
        total: 19425,
        lineItems: [
          { description: "Architectural Design", quantity: 1, unitPrice: 12000, total: 12000 },
          { description: "Permit Application Fees", quantity: 1, unitPrice: 2500, total: 2500 },
          { description: "Survey & Site Analysis", quantity: 1, unitPrice: 4000, total: 4000 },
        ],
      },
      {
        id: "inv-005",
        number: "INV-2025-005",
        projectId: "proj-003",
        projectName: "Downtown Commercial Fit-Out",
        status: "overdue",
        issuedDate: "2025-02-01",
        dueDate: "2025-03-01",
        subtotal: 95000,
        tax: 4750,
        total: 99750,
        lineItems: [
          { description: "Commercial HVAC System", quantity: 1, unitPrice: 35000, total: 35000 },
          { description: "Electrical Distribution Panel", quantity: 1, unitPrice: 18000, total: 18000 },
          { description: "Fire Suppression Install", quantity: 1, unitPrice: 22000, total: 22000 },
          { description: "Labor - Commercial Phase 1", quantity: 400, unitPrice: 50, total: 20000 },
        ],
      },
    ],
  };
}
