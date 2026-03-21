import { readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Props) {
  const startedAt = Date.now();
  const requestId = getRequestId(new Headers());
  const route = "/api/client-portal/documents/[id]";

  const { id } = await params;

  // Prevent path traversal
  if (id.includes("..") || id.includes("/") || id.includes("\\")) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Invalid document ID"),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  try {
    // The id could be the filename directly, or a UUID that we need to match
    let files: string[] = [];
    try {
      files = await readdir(UPLOAD_DIR);
    } catch {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Document not found"),
        { status: 404, headers: { "x-request-id": requestId } },
      );
    }

    // Try exact match first (filename as id), then partial match
    const target = files.find((f) => f === id) ?? files.find((f) => f.includes(id));

    if (!target) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Document not found"),
        { status: 404, headers: { "x-request-id": requestId } },
      );
    }

    await unlink(join(UPLOAD_DIR, target));

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Document deleted",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { filename: target },
    });

    return NextResponse.json(success({ deleted: true }), {
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Failed to delete document",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to delete document"),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
