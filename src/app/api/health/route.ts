import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      data: {
        status: "ok",
        service: "chimera-web",
        uptimeSeconds: Math.floor(process.uptime()),
      },
      error: null,
    },
    { status: 200 },
  );
}
