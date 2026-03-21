import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api";
import { verifyClientCredentials, generateToken } from "@/lib/client-store";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = rateLimit(
    "login",
    10,
    60 * 60 * 1000,
  );
  if (!allowed) {
    return NextResponse.json(
      failure("RATE_LIMITED", `Too many login attempts. Try again in ${retryAfterSeconds}s.`),
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Validation failed", parsed.error.flatten().fieldErrors),
      { status: 400 },
    );
  }

  const client = await verifyClientCredentials(parsed.data.email, parsed.data.password);
  if (!client) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid email or password"),
      { status: 401 },
    );
  }

  const token = generateToken(client.id);

  const response = NextResponse.json(
    success({
      id: client.id,
      name: client.name,
      email: client.email,
    }),
  );

  response.cookies.set("portalToken", token, {
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
