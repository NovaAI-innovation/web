import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { findClientById } from "@/lib/client-store";
import { getProjectsByClient } from "@/lib/project-store";
import { getInvoicesByClient } from "@/lib/invoice-store";
import { getPortalMessages } from "@/lib/portal-messages";
import { success, failure } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const client = await findClientById(id);
  if (!client) {
    return NextResponse.json(failure("VALIDATION_ERROR", "Client not found"), { status: 404 });
  }

  const [projects, invoices, messages] = await Promise.all([
    getProjectsByClient(id),
    getInvoicesByClient(id),
    getPortalMessages(id),
  ]);

  return NextResponse.json(
    success({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt,
        notificationPrefs: client.notificationPrefs,
      },
      projects,
      invoices,
      messageCount: messages.length,
    }),
  );
}
