import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { requirePortalAuth } from "@/lib/portal-auth";
import { canClientAccessDocument, isContractorDocument } from "@/lib/document-source";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));

async function ensureUploadDir() {
  try {
    await readdir(UPLOAD_DIR);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/documents";

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

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
    ).then((list) =>
      list.filter(
        (f) => isContractorDocument(f.filename) && canClientAccessDocument(f.filename, auth.client.id),
      ),
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
