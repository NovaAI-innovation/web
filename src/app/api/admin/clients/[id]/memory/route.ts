import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getAgentMemoryForClient } from "@/lib/portal-agent-memory";
import { success, failure } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const entries = await getAgentMemoryForClient(id, 100);
  return NextResponse.json(success(entries));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // Import fs to clear memory entries for this client
  const { readFile, writeFile, mkdir } = await import("node:fs/promises");
  const { join, resolve, dirname } = await import("node:path");

  const memPath = resolve(join(process.cwd(), ".data", "portal-agent-memory.json"));
  try {
    await mkdir(dirname(memPath), { recursive: true });
    const raw = await readFile(memPath, "utf-8").catch(() => '{"entries":[]}');
    const data = JSON.parse(raw) as { entries: Array<{ clientId: string }> };
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => e.clientId !== id);
    await writeFile(memPath, JSON.stringify(data, null, 2), "utf-8");
    return NextResponse.json(success({ deleted: before - data.entries.length }));
  } catch (err) {
    return NextResponse.json(failure("INTERNAL_ERROR", String(err)), { status: 500 });
  }
}
