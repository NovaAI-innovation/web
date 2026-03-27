import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { createInvoice, getAllInvoices, getInvoiceListSummary } from "@/lib/invoice-store";
import { success, failure } from "@/lib/api";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const createSchema = z.object({
  clientId: z.string().optional(),
  number: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  status: z.enum(["paid", "pending", "overdue"]).default("pending"),
  issuedDate: z.string(),
  dueDate: z.string(),
  paidDate: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  lineItems: z.array(lineItemSchema).default([]),
});

export async function GET(request?: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;
  const summary = request ? new URL(request.url).searchParams.get("summary") : null;
  const invoices = summary === "1" ? await getInvoiceListSummary() : await getAllInvoices();
  return NextResponse.json(success(invoices), {
    headers: {
      "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const invoice = await createInvoice(parsed.data);
  return NextResponse.json(success(invoice), { status: 201 });
}
