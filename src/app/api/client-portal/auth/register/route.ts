import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { registerClient, generateToken } from "@/lib/client-store";
import { rateLimit } from "@/lib/rate-limit";
import { initializePortalForClient } from "@/lib/portal-init";

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters"),
});

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = rateLimit(
    "register",
    5,
    60 * 60 * 1000,
  );
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many registrations. Try again in ${retryAfterSeconds}s.`),
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid JSON body"),
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  try {
    const client = await registerClient(parsed.data);
    await initializePortalForClient({ id: client.id, name: client.name });
    const token = generateToken(client.id);

    const response = NextResponse.json(
      success({
        id: client.id,
        name: client.name,
        email: client.email,
      }),
      { status: 201 },
    );

    response.cookies.set("portalToken", token, {
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
      httpOnly: true,
    });

    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "An account with this email already exists"),
        { status: 409 },
      );
    }
    return NextResponse.json(
      failure("INTERNAL_ERROR", "Registration failed"),
      { status: 500 },
    );
  }
}
