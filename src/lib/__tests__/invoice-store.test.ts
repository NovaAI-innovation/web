/**
 * Enterprise Invoice Store Test Suite
 * 
 * Covers: Invoice CRUD, financial calculations, status management,
 * client/project filtering, and summary aggregations.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "@/lib/fs-async";
import type { Invoice, InvoiceStatus } from "@/lib/invoice-store";

let getAllInvoices: typeof import("@/lib/invoice-store").getAllInvoices;
let getInvoiceById: typeof import("@/lib/invoice-store").getInvoiceById;
let getInvoicesByProject: typeof import("@/lib/invoice-store").getInvoicesByProject;
let getInvoicesByClient: typeof import("@/lib/invoice-store").getInvoicesByClient;
let getInvoiceSummaryByClient: typeof import("@/lib/invoice-store").getInvoiceSummaryByClient;
let hasProjectUnpaidBalance: typeof import("@/lib/invoice-store").hasProjectUnpaidBalance;
let createInvoice: typeof import("@/lib/invoice-store").createInvoice;
let updateInvoice: typeof import("@/lib/invoice-store").updateInvoice;
let deleteInvoice: typeof import("@/lib/invoice-store").deleteInvoice;

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

describe("Invoice Store Module", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/invoice-store");
    getAllInvoices = mod.getAllInvoices;
    getInvoiceById = mod.getInvoiceById;
    getInvoicesByProject = mod.getInvoicesByProject;
    getInvoicesByClient = mod.getInvoicesByClient;
    getInvoiceSummaryByClient = mod.getInvoiceSummaryByClient;
    hasProjectUnpaidBalance = mod.hasProjectUnpaidBalance;
    createInvoice = mod.createInvoice;
    updateInvoice = mod.updateInvoice;
    deleteInvoice = mod.deleteInvoice;
  });

  const mockInvoices: Invoice[] = [
    {
      id: "inv-001",
      clientId: "client-001",
      projectId: "proj-001",
      projectName: "Project 1",
      number: "INV-2025-001",
      status: "paid",
      issuedDate: "2025-01-15",
      dueDate: "2025-02-15",
      paidDate: "2025-02-10",
      subtotal: 10000,
      tax: 500,
      total: 10500,
      lineItems: [
        { description: "Service A", quantity: 10, unitPrice: 1000, total: 10000 },
      ],
    },
    {
      id: "inv-002",
      clientId: "client-001",
      projectId: "proj-001",
      projectName: "Project 1",
      number: "INV-2025-002",
      status: "pending",
      issuedDate: "2025-02-15",
      dueDate: "2025-03-15",
      subtotal: 5000,
      tax: 250,
      total: 5250,
      lineItems: [
        { description: "Service B", quantity: 5, unitPrice: 1000, total: 5000 },
      ],
    },
    {
      id: "inv-003",
      clientId: "client-001",
      projectId: "proj-002",
      projectName: "Project 2",
      number: "INV-2025-003",
      status: "overdue",
      issuedDate: "2025-01-01",
      dueDate: "2025-02-01",
      subtotal: 8000,
      tax: 400,
      total: 8400,
      lineItems: [],
    },
    {
      id: "inv-004",
      clientId: "client-002",
      projectId: "proj-003",
      projectName: "Project 3",
      number: "INV-2025-004",
      status: "paid",
      issuedDate: "2025-01-20",
      dueDate: "2025-02-20",
      paidDate: "2025-02-18",
      subtotal: 15000,
      tax: 750,
      total: 15750,
      lineItems: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Invoice Retrieval", () => {
    it("should get all invoices", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoices = await getAllInvoices();

      expect(invoices).toHaveLength(4);
    });

    it("should get invoice by id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoice = await getInvoiceById("inv-001");

      expect(invoice).toBeDefined();
      expect(invoice?.number).toBe("INV-2025-001");
    });

    it("should return null for non-existent invoice", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoice = await getInvoiceById("non-existent");

      expect(invoice).toBeNull();
    });

    it("should get invoices by project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoices = await getInvoicesByProject("proj-001");

      expect(invoices).toHaveLength(2);
      expect(invoices.every((i) => i.projectId === "proj-001")).toBe(true);
    });

    it("should get invoices by client", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoices = await getInvoicesByClient("client-001");

      expect(invoices).toHaveLength(3);
      expect(invoices.every((i) => i.clientId === "client-001")).toBe(true);
    });
  });

  describe("Financial Calculations", () => {
    it("should calculate invoice summary correctly", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const summary = await getInvoiceSummaryByClient("client-001");

      expect(summary.totalInvoices).toBe(3);
      expect(summary.totalPaid).toBe(10500);
      expect(summary.totalOutstanding).toBe(5250 + 8400); // pending + overdue
      expect(summary.paidCount).toBe(1);
      expect(summary.pendingCount).toBe(1);
      expect(summary.overdueCount).toBe(1);
    });

    it("should return zero values for client with no invoices", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const summary = await getInvoiceSummaryByClient("no-invoice-client");

      expect(summary.totalInvoices).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.totalOutstanding).toBe(0);
      expect(summary.paidCount).toBe(0);
      expect(summary.pendingCount).toBe(0);
      expect(summary.overdueCount).toBe(0);
    });

    it("should detect unpaid balance for project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const hasUnpaid = await hasProjectUnpaidBalance("proj-001");

      expect(hasUnpaid).toBe(true); // Has pending invoice
    });

    it("should return false for fully paid project", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const hasUnpaid = await hasProjectUnpaidBalance("proj-003");

      expect(hasUnpaid).toBe(false);
    });

    it("should handle line item totals correctly", async () => {
      const invoice = mockInvoices[0];
      
      const calculatedSubtotal = invoice.lineItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      expect(calculatedSubtotal).toBe(invoice.subtotal);
    });
  });

  describe("Invoice CRUD", () => {
    it("should create new invoice with generated id", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: [] }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const newInvoice = await createInvoice({
        clientId: "client-001",
        projectId: "proj-001",
        projectName: "Test Project",
        number: "INV-2025-005",
        status: "pending",
        issuedDate: "2025-03-01",
        dueDate: "2025-04-01",
        subtotal: 10000,
        tax: 500,
        total: 10500,
        lineItems: [],
      });

      expect(newInvoice.id).toMatch(/^inv-\d+$/);
      expect(newInvoice.number).toBe("INV-2025-005");
    });

    it("should update invoice fields", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateInvoice("inv-002", {
        status: "paid",
        paidDate: "2025-03-10",
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe("paid");
      expect(updated?.paidDate).toBe("2025-03-10");
    });

    it("should not change invoice id on update", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateInvoice("inv-001", { status: "overdue" });

      expect(updated?.id).toBe("inv-001");
    });

    it("should return null when updating non-existent invoice", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const updated = await updateInvoice("non-existent", { status: "paid" });

      expect(updated).toBeNull();
    });

    it("should delete invoice and return true", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const deleted = await deleteInvoice("inv-001");

      expect(deleted).toBe(true);
    });

    it("should return false when deleting non-existent invoice", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const deleted = await deleteInvoice("non-existent");

      expect(deleted).toBe(false);
    });
  });

  describe("Status Management", () => {
    it("should handle all valid status values", async () => {
      const statuses: InvoiceStatus[] = ["paid", "pending", "overdue"];

      for (const status of statuses) {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));
        (fs.writeFile as any).mockResolvedValue(undefined);

        const updated = await updateInvoice("inv-001", { status });
        expect(updated?.status).toBe(status);
      }
    });

    it("should track paid date separately from due date", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));
      (fs.writeFile as any).mockResolvedValue(undefined);

      const updated = await updateInvoice("inv-002", {
        status: "paid",
        paidDate: "2025-03-01",
      });

      expect(updated?.dueDate).toBe("2025-03-15"); // Original due date
      expect(updated?.paidDate).toBe("2025-03-01"); // New paid date
    });
  });

  describe("Line Items", () => {
    it("should handle invoices with multiple line items", async () => {
      const invoiceWithItems: Invoice = {
        id: "inv-test",
        clientId: "client-001",
        projectId: "proj-001",
        projectName: "Test",
        number: "INV-TEST",
        status: "pending",
        issuedDate: "2025-01-01",
        dueDate: "2025-02-01",
        subtotal: 3000,
        tax: 150,
        total: 3150,
        lineItems: [
          { description: "Item 1", quantity: 2, unitPrice: 500, total: 1000 },
          { description: "Item 2", quantity: 1, unitPrice: 1000, total: 1000 },
          { description: "Item 3", quantity: 5, unitPrice: 200, total: 1000 },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: [invoiceWithItems] }));

      const invoice = await getInvoiceById("inv-test");

      expect(invoice?.lineItems).toHaveLength(3);
      expect(invoice?.lineItems.reduce((sum, item) => sum + item.total, 0)).toBe(3000);
    });

    it("should handle invoices with no line items", async () => {
      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: mockInvoices }));

      const invoice = await getInvoiceById("inv-003");

      expect(invoice?.lineItems).toEqual([]);
    });

    it("should validate line item calculations", () => {
      const lineItem = {
        description: "Test Service",
        quantity: 10,
        unitPrice: 100,
        total: 1000,
      };

      expect(lineItem.quantity * lineItem.unitPrice).toBe(lineItem.total);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file", async () => {
      (fs.readFile as any).mockResolvedValue("");

      const invoices = await getAllInvoices();

      expect(invoices).toEqual([]);
    });

    it("should handle missing optional fields", async () => {
      const invoiceWithoutOptional = {
        id: "inv-minimal",
        clientId: "client-001",
        projectId: "proj-001",
        projectName: "Minimal",
        number: "INV-MIN",
        status: "pending",
        issuedDate: "2025-01-01",
        dueDate: "2025-02-01",
        subtotal: 1000,
        tax: 50,
        total: 1050,
        lineItems: [],
        // No paidDate, no isFinalInvoice
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: [invoiceWithoutOptional] }));

      const invoice = await getInvoiceById("inv-minimal");

      expect(invoice).toBeDefined();
      expect(invoice?.paidDate).toBeUndefined();
      expect(invoice?.isFinalInvoice).toBeUndefined();
    });

    it("should handle final invoice flag", async () => {
      const finalInvoice: Invoice = {
        id: "inv-final",
        clientId: "client-001",
        projectId: "proj-001",
        projectName: "Test",
        number: "INV-FINAL",
        status: "pending",
        issuedDate: "2025-01-01",
        dueDate: "2025-02-01",
        subtotal: 5000,
        tax: 250,
        total: 5250,
        lineItems: [],
        isFinalInvoice: true,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify({ invoices: [finalInvoice] }));

      const invoice = await getInvoiceById("inv-final");

      expect(invoice?.isFinalInvoice).toBe(true);
    });
  });
});
