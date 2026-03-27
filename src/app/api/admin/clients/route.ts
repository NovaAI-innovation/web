import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getAllClients } from "@/lib/client-store";
import { getAllProjects } from "@/lib/project-store";
import { success } from "@/lib/api";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const [clients, projects] = await Promise.all([getAllClients(), getAllProjects()]);
  const countsByClient = new Map<string, { projectCount: number; activeProjectCount: number }>();

  for (const project of projects) {
    if (!project.clientId) continue;
    const current = countsByClient.get(project.clientId) ?? { projectCount: 0, activeProjectCount: 0 };
    current.projectCount += 1;
    if (project.status === "active") current.activeProjectCount += 1;
    countsByClient.set(project.clientId, current);
  }

  const withMeta = clients.map((c) => {
    const counts = countsByClient.get(c.id) ?? { projectCount: 0, activeProjectCount: 0 };
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt,
      projectCount: counts.projectCount,
      activeProjectCount: counts.activeProjectCount,
    };
  });

  return NextResponse.json(success(withMeta));
}
