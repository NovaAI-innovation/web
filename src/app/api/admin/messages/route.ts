import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getThreadSummaries } from "@/lib/portal-messages";
import { getAllClients } from "@/lib/client-store";
import { success } from "@/lib/api";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const [summaries, clients] = await Promise.all([getThreadSummaries(), getAllClients()]);

  const clientMap = new Map(clients.map((c) => [c.id, { name: c.name, email: c.email }]));

  const enriched = summaries
    .map((s) => ({ ...s, client: clientMap.get(s.clientId) ?? null }))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json(success(enriched));
}
