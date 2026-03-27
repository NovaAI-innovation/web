import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getThreadSummaries } from "@/lib/portal-messages";
import { getClientListSummary } from "@/lib/client-store";
import { success } from "@/lib/api";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const [summaries, clients] = await Promise.all([getThreadSummaries(), getClientListSummary()]);

  const clientMap = new Map(clients.map((c) => [c.id, { name: c.name, email: c.email }]));

  const enriched = summaries.map((s) => ({ ...s, client: clientMap.get(s.clientId) ?? null }));

  return NextResponse.json(success(enriched), {
    headers: {
      "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
    },
  });
}
