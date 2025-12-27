import { scryptSync, timingSafeEqual } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

export type LocalUserRecord = {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  passwordSalt: string;
  passwordHash: string;
};

let cachedUsers: LocalUserRecord[] | null = null;

export async function loadLocalUsers(): Promise<LocalUserRecord[]> {
  if (cachedUsers) return cachedUsers;

  const usersFile =
    process.env.LOCAL_USERS_FILE ?? path.join(process.cwd(), "local-users.json");

  const raw = await readFile(usersFile, "utf8");
  const parsed = JSON.parse(raw) as { users?: LocalUserRecord[] } | LocalUserRecord[];
  cachedUsers = Array.isArray(parsed) ? parsed : (parsed.users ?? []);

  return cachedUsers;
}

export function verifyPasswordScrypt(params: {
  password: string;
  salt: string;
  expectedHashBase64: string;
}): boolean {
  const expected = Buffer.from(params.expectedHashBase64, "base64");
  const derived = scryptSync(params.password, params.salt, expected.length);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

