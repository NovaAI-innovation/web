import fs from 'fs';
import path from 'path';

export type DocumentSource = 'contractor' | 'client';

export type DocumentSourceEntry = {
  filename: string;
  source: DocumentSource;
  clientId: string;
  projectId?: string;
  recordedAt: string;
};

type DocumentSourceFile = {
  documents: DocumentSourceEntry[];
};

const DATA_PATH = path.join(process.cwd(), '.data', 'document-source.json');

function ensureFile(): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ documents: [] }, null, 2), 'utf-8');
  }
}

function readFile(): DocumentSourceFile {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return raw ? (JSON.parse(raw) as DocumentSourceFile) : { documents: [] };
  } catch {
    return { documents: [] };
  }
}

function saveFile(data: DocumentSourceFile): void {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function recordDocumentSource(
  filename: string,
  source: DocumentSource,
  clientId: string,
  projectId?: string,
): void {
  const data = readFile();
  // Remove any existing entry for this filename before adding the new one
  data.documents = data.documents.filter((d) => d.filename !== filename);
  const entry: DocumentSourceEntry = {
    filename,
    source,
    clientId,
    recordedAt: new Date().toISOString(),
  };
  if (projectId) entry.projectId = projectId;
  data.documents.push(entry);
  saveFile(data);
}

export function getDocumentSource(filename: string): DocumentSource {
  const data = readFile();
  const entry = data.documents.find((d) => d.filename === filename);
  return entry?.source ?? 'contractor';
}

export function isContractorDocument(filename: string): boolean {
  const meta = getDocumentMeta(filename);
  return meta?.source === 'contractor';
}

export function getDocumentMeta(filename: string): DocumentSourceEntry | null {
  const data = readFile();
  return data.documents.find((d) => d.filename === filename) ?? null;
}

export function canClientAccessDocument(filename: string, clientId: string): boolean {
  const meta = getDocumentMeta(filename);
  if (!meta) return false;
  return meta.clientId === clientId;
}

export function isClientOwnedDocument(filename: string, clientId: string): boolean {
  const meta = getDocumentMeta(filename);
  if (!meta) return false;
  return meta.clientId === clientId && meta.source === 'client';
}

export function getDocumentsByProject(projectId: string): DocumentSourceEntry[] {
  const data = readFile();
  return data.documents.filter((d) => d.source === 'contractor' && d.projectId === projectId);
}

export function getDocumentsByClient(clientId: string): DocumentSourceEntry[] {
  const data = readFile();
  return data.documents.filter((d) => d.source === 'contractor' && d.clientId === clientId);
}
