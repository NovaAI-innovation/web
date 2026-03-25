import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/lib/invoice-store";
import { success, failure } from "@/lib/api";

const updateSchema = z.object({
  status: z.enum(["paid", "pending", "overdue"]).optional(),
  paidDate: z.string().optional(),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
  isFinalInvoice: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const invoice = await updateInvoice(id, parsed.data);
  if (!invoice) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invoice not found"), { status: 404 });
  }
  return NextResponse.json(success(invoice));
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deleteInvoice(id);
  if (!deleted) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invoice not found"), { status: 404 });
  }
  return NextResponse.json(success({ deleted: true }));
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invoice not found"), { status: 404 });
  }
  return NextResponse.json(success(invoice));
}
