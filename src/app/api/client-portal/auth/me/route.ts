import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { requirePortalAuth } from "@/lib/portal-auth";

export async function GET() {
  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;
  const { client } = auth;
  return NextResponse.json(
    success({ id: client.id, name: client.name, email: client.email, phone: client.phone }),
  );
}
