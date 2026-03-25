import { NextResponse } from "next/server";
import { success } from "@/lib/api";

export async function POST() {
  const response = NextResponse.json(success({ ok: true }));
  response.cookies.set("adminToken", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
