import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api";
import { logEvent } from "@/lib/observability";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { requirePortalAuth } from "@/lib/portal-auth";
import { recordDocumentSource } from "@/lib/document-source";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const route = "/api/client-portal/documents/upload";

  const auth = await requirePortalAuth();
  if (!auth.ok) return auth.response;

  // Rate limiting (more strict for uploads)
  const throttle = rateLimit(`upload:${auth.client.id}`, 10, 60 * 60 * 1000);
  if (!throttle.allowed) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Upload rate limited",
      requestId,
      route,
      status: 429,
      errorCode: "RATE_LIMITED",
      durationMs: endedAt - startedAt,
    });
    return NextResponse.json(
      failure("RATE_LIMITED", "Too many uploads. Try again later."),
      { status: 429, headers: { "x-request-id": requestId } }
    );
  }

  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const sourceParam = formData.get("source");
    const source: 'contractor' | 'client' = sourceParam === 'contractor' ? 'contractor' : 'client';
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "No file provided"),
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "File too large. Maximum 25MB allowed."),
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX"),
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const filename = `${timestamp}-${safeName}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, buffer);
    recordDocumentSource(filename, source, auth.client.id);

    const endedAt = Date.now();
    logEvent({
      level: "info",
      message: "File uploaded successfully",
      requestId,
      route,
      status: 200,
      durationMs: endedAt - startedAt,
      context: { filename: safeName, size: file.size, type: file.type },
    });

    return NextResponse.json(
      success({
        id: crypto.randomUUID(),
        name: file.name,
        filename,
        size: file.size,
        type: file.type,
        url: `/api/client-portal/documents/download/${filename}`,
        uploadedAt: new Date().toISOString(),
      }),
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    const endedAt = Date.now();
    logEvent({
      level: "error",
      message: "Upload failed",
      requestId,
      route,
      status: 500,
      errorCode: "INTERNAL_ERROR",
      durationMs: endedAt - startedAt,
      context: { error: String(error) },
    });

    return NextResponse.json(
      failure("INTERNAL_ERROR", "Failed to upload file"),
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
