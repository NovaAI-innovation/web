import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

type PlanningRequest = {
  id: string;
  scope: string;
  timeline: string;
  budget: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

type PlanningFile = {
  requests: PlanningRequest[];
};

const defaultFile: PlanningFile = { requests: [] };

function resolvePath(): string {
  return resolve(join(process.cwd(), ".data", "planning-requests.json"));
}

async function ensureFile(): Promise<void> {
  const filePath = resolvePath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultFile, null, 2), "utf-8");
  }
}

export async function savePlanningRequest(input: {
  scope: string;
  timeline: string;
  budget: string;
  name: string;
  email: string;
  phone: string;
}): Promise<string> {
  await ensureFile();
  const filePath = resolvePath();
  const raw = await readFile(filePath, "utf-8");
  const parsed = raw ? (JSON.parse(raw) as PlanningFile) : defaultFile;

  const id = crypto.randomUUID();
  parsed.requests.push({
    id,
    ...input,
    createdAt: new Date().toISOString(),
  });

  await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  return id;
}
