import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { failure, success } from "@/lib/api";
import { requireAdminAuth } from "@/lib/admin-auth";
import { recordDocumentSource } from "@/lib/document-source";

const UPLOAD_DIR = resolve(join(process.cwd(), ".data", "uploads"));
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for contractor docs
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientIdParam = formData.get("clientId") as string | null;
    const projectIdParam = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json(failure("VALIDATION_ERROR", "No file provided"), { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "File too large. Maximum 50MB allowed."),
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Unsupported file type"),
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name);
    const filename = `${Date.now()}-${safeName}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, buffer);
    recordDocumentSource(filename, "contractor", clientIdParam ?? '', projectIdParam ?? undefined);

    return NextResponse.json(
      success({
        id: crypto.randomUUID(),
        name: file.name,
        filename,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      failure("INTERNAL_ERROR", `Upload failed: ${String(error)}`),
      { status: 500 },
    );
  }
}
