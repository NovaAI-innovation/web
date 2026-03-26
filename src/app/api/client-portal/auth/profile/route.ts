import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { requirePortalAuth } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
});

export async function PUT(request: Request) {
  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure("VALIDATION_ERROR", "Invalid JSON"), { status: 400 });
  }

  const validated = profileSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", validated.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const updates: Record<string, string> = {};
  if (validated.data.name) updates.name = validated.data.name;
  if (validated.data.email) updates.email = validated.data.email.toLowerCase();
  if (validated.data.phone) updates.phone = validated.data.phone;

  const updated = await prisma.user.update({
    where: { id: auth.client.id },
    data: updates,
  });

  return NextResponse.json(
    success({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone }),
  );
}
