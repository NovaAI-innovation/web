import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));

async function ensureUploadDir() {
  try {
    await readdir(UPLOAD_DIR);
  } catch {
    return [];
  }
}

export async function GET() {
  const startedAt = Date.now();
  const requestId = getRequestId(new Headers());
  const route = "/api/client-portal/documents";

  try {
    await ensureUploadDir();
    
    let files: string[] = [];
    try {
      files = await readdir(UPLOAD_DIR);
    } catch {
      files = [];
    }

    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = join(UPLOAD_DIR, filename);
        const stats = await stat(filePath);
        
        return {
          id: filename,
          name: filename.replace(/^\d+-/, ''),
          filename,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          url: `/api/client-portal/documents/download/${filename}`,
        };
      })
    );

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "Documents list retrieved",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { count: fileList.length },
    });

    return NextResponse.json(success(fileList));
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Failed to list documents",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      { data: [], error: { code: "INTERNAL_ERROR", message: "Failed to load documents" } },
      { status: 500 }
    );
  }
}
