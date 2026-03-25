import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";

export type NotificationPreferences = {
  email: boolean;
  messages: boolean;
  milestones: boolean;
  budget: boolean;
};

export type StoredClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  notificationPrefs?: NotificationPreferences;
  resetToken?: string;
  resetTokenExpiry?: string;
};

type ClientFile = {
  clients: StoredClient[];
};

const defaultClientFile: ClientFile = { clients: [] };

function resolveClientPath(): string {
  return resolve(join(process.cwd(), ".data", "clients.json"));
}

async function ensureFile(): Promise<void> {
  const filePath = resolveClientPath();
  const folder = dirname(filePath);
  await mkdir(folder, { recursive: true });

  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, JSON.stringify(defaultClientFile, null, 2), "utf-8");
  }
}

async function readClients(): Promise<ClientFile> {
  await ensureFile();
  const raw = await readFile(resolveClientPath(), "utf-8");
  return raw ? (JSON.parse(raw) as ClientFile) : defaultClientFile;
}

async function writeClients(data: ClientFile): Promise<void> {
  await ensureFile();
  await writeFile(resolveClientPath(), JSON.stringify(data, null, 2), "utf-8");
}

function hashPassword(password: string, salt: string): string {
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

export async function getAllClients(): Promise<StoredClient[]> {
  const data = await readClients();
  return data.clients;
}

export async function findClientByEmail(email: string): Promise<StoredClient | null> {
  const data = await readClients();
  return data.clients.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findClientById(id: string): Promise<StoredClient | null> {
  const data = await readClients();
  return data.clients.find((c) => c.id === id) ?? null;
}

export async function updateClient(
  id: string,
  updates: Partial<Pick<StoredClient, "name" | "email" | "phone">>,
): Promise<StoredClient | null> {
  const data = await readClients();
  const index = data.clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  if (updates.name) data.clients[index].name = updates.name;
  if (updates.email) data.clients[index].email = updates.email.toLowerCase();
  if (updates.phone) data.clients[index].phone = updates.phone;

  await writeClients(data);
  return data.clients[index];
}

export async function registerClient(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<StoredClient> {
  const data = await readClients();

  const existing = data.clients.find(
    (c) => c.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const salt = randomBytes(16).toString("hex");
  const client: StoredClient = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    passwordHash: hashPassword(input.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };

  data.clients.push(client);
  await writeClients(data);
  return client;
}

export async function verifyClientCredentials(
  email: string,
  password: string,
): Promise<StoredClient | null> {
  const client = await findClientByEmail(email);
  if (!client) return null;

  const hash = hashPassword(password, client.salt);
  if (hash !== client.passwordHash) return null;

  return client;
}

export async function changeClientPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const data = await readClients();
  const index = data.clients.findIndex((c) => c.id === id);
  if (index === -1) return { success: false, error: "Account not found" };

  const client = data.clients[index];
  const currentHash = hashPassword(currentPassword, client.salt);
  if (currentHash !== client.passwordHash) {
    return { success: false, error: "Current password is incorrect" };
  }

  const newSalt = randomBytes(16).toString("hex");
  data.clients[index].passwordHash = hashPassword(newPassword, newSalt);
  data.clients[index].salt = newSalt;

  await writeClients(data);
  return { success: true };
}

export function generateToken(clientId: string): string {
  const payload = `${clientId}:${Date.now()}:${randomBytes(16).toString("hex")}`;
  return Buffer.from(payload).toString("base64url");
}

export function parseToken(token: string): { clientId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [clientId, timestampStr] = decoded.split(":");
    const timestamp = Number(timestampStr);
    if (!clientId || isNaN(timestamp)) return null;
    return { clientId, timestamp };
  } catch {
    return null;
  }
}

// --- Password Reset ---

export async function createResetToken(email: string): Promise<string | null> {
  const data = await readClients();
  const index = data.clients.findIndex(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );
  if (index === -1) return null;

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  data.clients[index].resetToken = createHash("sha256").update(token).digest("hex");
  data.clients[index].resetTokenExpiry = expiry;

  await writeClients(data);
  return token;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const data = await readClients();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const index = data.clients.findIndex((c) => c.resetToken === tokenHash);
  if (index === -1) return { success: false, error: "Invalid or expired reset link" };

  const client = data.clients[index];
  if (!client.resetTokenExpiry || new Date(client.resetTokenExpiry) < new Date()) {
    // Clean up expired token
    delete data.clients[index].resetToken;
    delete data.clients[index].resetTokenExpiry;
    await writeClients(data);
    return { success: false, error: "Reset link has expired" };
  }

  const newSalt = randomBytes(16).toString("hex");
  data.clients[index].passwordHash = hashPassword(newPassword, newSalt);
  data.clients[index].salt = newSalt;
  delete data.clients[index].resetToken;
  delete data.clients[index].resetTokenExpiry;

  await writeClients(data);
  return { success: true };
}

// --- Notification Preferences ---

const defaultNotificationPrefs: NotificationPreferences = {
  email: true,
  messages: true,
  milestones: true,
  budget: false,
};

export async function getNotificationPrefs(clientId: string): Promise<NotificationPreferences> {
  const client = await findClientById(clientId);
  return client?.notificationPrefs ?? defaultNotificationPrefs;
}

export async function updateNotificationPrefs(
  clientId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const data = await readClients();
  const index = data.clients.findIndex((c) => c.id === clientId);
  if (index === -1) return defaultNotificationPrefs;

  const current = data.clients[index].notificationPrefs ?? defaultNotificationPrefs;
  const updated = { ...current, ...prefs };
  data.clients[index].notificationPrefs = updated;

  await writeClients(data);
  return updated;
}
