import { mkdir, readFile, writeFile } from "@/lib/fs-async";
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

export type InvoiceListSummary = Pick<
  Invoice,
  "id" | "clientId" | "number" | "projectId" | "projectName" | "status" | "issuedDate" | "dueDate" | "paidDate" | "total"
>;

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
    await writeFile(filePath, JSON.stringify(defaultInvoicesFile, null, 2), "utf-8");
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

export async function getInvoiceListSummary(): Promise<InvoiceListSummary[]> {
  const invoices = await getAllInvoices();
  return invoices.map((invoice) => ({
    id: invoice.id,
    clientId: invoice.clientId,
    number: invoice.number,
    projectId: invoice.projectId,
    projectName: invoice.projectName,
    status: invoice.status,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidDate,
    total: invoice.total,
  }));
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
