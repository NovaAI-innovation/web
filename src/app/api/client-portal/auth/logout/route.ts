import { NextResponse } from "next/server";
import { success } from "@/lib/api";

export async function POST() {
  const response = NextResponse.json(success({ message: "Logged out" }));
  response.cookies.set("portalToken", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return response;
}
