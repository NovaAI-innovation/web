import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getAllClients } from "@/lib/client-store";
import { getProjectsByClient } from "@/lib/project-store";
import { success } from "@/lib/api";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const clients = await getAllClients();

  const withMeta = await Promise.all(
    clients.map(async (c) => {
      const projects = await getProjectsByClient(c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        projectCount: projects.length,
        activeProjectCount: projects.filter((p) => p.status === "active").length,
      };
    }),
  );

  return NextResponse.json(success(withMeta));
}
