import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));

type Props = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const startedAt = Date.now();
  const requestId = getRequestId(new Headers());
  const route = "/api/client-portal/documents/download";

  const { filename } = await params;

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid filename" } },
      { status: 400 },
    );
  }

  const filePath = join(UPLOAD_DIR, filename);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_ERROR", message: "Not found" } },
        { status: 404 },
      );
    }

    const buffer = await readFile(filePath);

    // Derive display name by stripping the timestamp prefix
    const displayName = filename.replace(/^\d+-/, "");

    // Guess content type from extension
    const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
    const contentTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Document downloaded",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { filename: displayName, size: fileStat.size },
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${displayName}"`,
        "Content-Length": String(fileStat.size),
        "x-request-id": requestId,
      },
    });
  } catch {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Document not found",
      requestId,
      route,
      status: 404,
      durationMs: endedAt - startedAt,
      context: { filename },
    });

    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Document not found" } },
      { status: 404, headers: { "x-request-id": requestId } },
    );
  }
}
