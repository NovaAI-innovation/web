import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ContactSubmission } from "@/lib/contact";

type StoredLead = ContactSubmission & {
  leadId: string;
  createdAt: string;
};

type LeadFile = {
  leads: StoredLead[];
};

const defaultLeadFile: LeadFile = { leads: [] };

function resolveLeadPath(): string {
  const fileName = process.env.LEADS_DATA_FILE_NAME ?? "leads.json";
  return resolve(join(process.cwd(), ".data", fileName));
}

async function ensureFile(): Promise<void> {
  const filePath = resolveLeadPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultLeadFile, null, 2), "utf-8");
  }
}

export async function saveLead(input: ContactSubmission): Promise<string> {
  await ensureFile();
  const filePath = resolveLeadPath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as LeadFile) : defaultLeadFile;

  const leadId = crypto.randomUUID();
  parsed.leads.push({
    leadId,
    createdAt: new Date().toISOString(),
    ...input,
  });
  await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  return leadId;
}
