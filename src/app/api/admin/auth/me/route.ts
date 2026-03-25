import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { success } from "@/lib/api";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;
  return NextResponse.json(success({ ok: true }));
}
