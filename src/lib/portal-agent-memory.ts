import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type AgentMemoryEntry = {
  id: string;
  clientId: string;
  query: string;
  responseSummary: string;
  artifactRefs: string[];
  createdAt: string;
};

type AgentMemoryFile = {
  entries: AgentMemoryEntry[];
};

const defaultMemory: AgentMemoryFile = { entries: [] };

function resolveMemoryPath(): string {
  return resolve(join(process.cwd(), ".data", "portal-agent-memory.json"));
}

async function ensureMemoryFile(): Promise<void> {
  const filePath = resolveMemoryPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultMemory, null, 2), "utf-8");
  }
}

async function readMemory(): Promise<AgentMemoryFile> {
  await ensureMemoryFile();
  const raw = await readFile(resolveMemoryPath(), "utf-8");
  return raw ? (JSON.parse(raw) as AgentMemoryFile) : defaultMemory;
}

async function writeMemory(data: AgentMemoryFile): Promise<void> {
  await ensureMemoryFile();
  await writeFile(resolveMemoryPath(), JSON.stringify(data, null, 2), "utf-8");
}

export async function getAgentMemoryForClient(clientId: string, limit = 12): Promise<AgentMemoryEntry[]> {
  const data = await readMemory();
  return data.entries
    .filter((entry) => entry.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function addAgentMemoryEntry(input: {
  clientId: string;
  query: string;
  responseSummary: string;
  artifactRefs?: string[];
}): Promise<AgentMemoryEntry> {
  const data = await readMemory();
  const entry: AgentMemoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientId: input.clientId,
    query: input.query,
    responseSummary: input.responseSummary,
    artifactRefs: input.artifactRefs ?? [],
    createdAt: new Date().toISOString(),
  };

  data.entries.push(entry);

  // Keep lightweight memory bounded per client.
  const grouped = data.entries
    .filter((item) => item.clientId === input.clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const keepIds = new Set(grouped.slice(0, 100).map((item) => item.id));

  data.entries = data.entries.filter((item) => item.clientId !== input.clientId || keepIds.has(item.id));

  await writeMemory(data);
  return entry;
}
