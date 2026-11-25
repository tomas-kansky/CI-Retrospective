import { eq, inArray, lt } from "drizzle-orm";
import {
  appSettings,
  loginAttempts,
  DEFAULT_ADMIN_PASSWORD_HASH,
  type createDb,
} from "./db";
import type { Env } from "./room";

export const SESSION_COOKIE_NAME = "retro_session";
export const DEVICE_COOKIE_NAME = "retro_device_id";
export const PBKDF2_ITERATIONS = 60000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hodin
export const SHARE_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hodina (H+1)
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hodin

export interface AuthSession {
  role: "admin" | "user";
  teamId: string | null;
  exp: number;
}

type DbClient = ReturnType<typeof createDb>;

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(
    new Uint8Array(derived)
  )}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 100000) {
      return false;
    }
    const salt = hexToBytes(parts[2]);
    const expected = hexToBytes(parts[3]);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derived = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: salt as BufferSource,
          iterations,
          hash: "SHA-256",
        },
        keyMaterial,
        expected.length * 8
      )
    );

    return constantTimeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function computeHmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToHex(new Uint8Array(sig));
}

export function generateSecureToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function getAuthSecret(db: DbClient, env: Env): Promise<string> {
  if (env.AUTH_SECRET && env.AUTH_SECRET.trim()) {
    return env.AUTH_SECRET.trim();
  }

  const existing = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "auth_secret"),
  });
  if (existing?.value) {
    return existing.value;
  }

  const generated = generateSecureToken(32);
  const now = new Date().toISOString();
  await db
    .insert(appSettings)
    .values({
      key: "auth_secret",
      value: generated,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const stored = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "auth_secret"),
  });
  return stored?.value || generated;
}

export async function getAdminPasswordHash(db: DbClient, env: Env): Promise<string> {
  if (env.ADMIN_PASSWORD_HASH && env.ADMIN_PASSWORD_HASH.trim()) {
    return env.ADMIN_PASSWORD_HASH.trim();
  }

  const existing = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "admin_password_hash"),
  });
  return existing?.value || DEFAULT_ADMIN_PASSWORD_HASH;
}

export async function signSessionToken(session: AuthSession, secret: string): Promise<string> {
  const payloadStr = JSON.stringify(session);
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payloadStr));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64))
  );

  return `${payloadB64}.${bytesToBase64Url(sigBytes)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<AuthSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64))
    );
    const actualSig = base64UrlToBytes(sigB64);

    if (!constantTimeEqual(actualSig, expectedSig)) {
      return null;
    }

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    if (
      !parsed ||
      (parsed.role !== "admin" && parsed.role !== "user") ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }

    return {
      role: parsed.role,
      teamId: typeof parsed.teamId === "string" ? parsed.teamId : null,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!name) continue;
    try {
      result[name] = decodeURIComponent(val);
    } catch {
      result[name] = val;
    }
  }
  return result;
}

export function isSecureRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (url.protocol === "https:") return true;
  } catch {}
  return request.headers.get("x-forwarded-proto") === "https";
}

export function buildSessionCookie(token: string, isSecure: boolean): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (isSecure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearSessionCookie(isSecure: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (isSecure) parts.push("Secure");
  return parts.join("; ");
}

export function buildDeviceCookie(deviceId: string, isSecure: boolean): string {
  const maxAge = 365 * 24 * 60 * 60;
  const parts = [
    `${DEVICE_COOKIE_NAME}=${encodeURIComponent(deviceId)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (isSecure) parts.push("Secure");
  return parts.join("; ");
}

export async function getSessionFromRequest(
  request: Request,
  db: DbClient,
  env: Env
): Promise<AuthSession | null> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const secret = await getAuthSecret(db, env);
  return verifySessionToken(token, secret);
}

export async function getLockoutKeys(
  request: Request,
  secret: string
): Promise<{ keys: string[]; deviceId: string; isNewDeviceCookie: boolean }> {
  const cookies = parseCookies(request.headers.get("cookie"));
  let deviceId = cookies[DEVICE_COOKIE_NAME] || "";
  let isNewDeviceCookie = false;

  if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
    deviceId = crypto.randomUUID();
    isNewDeviceCookie = true;
  }

  const keys: string[] = [`dev:${deviceId}`];
  const rawIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (rawIp) {
    const ipHash = await computeHmacHex(secret, `ip:${rawIp}`);
    keys.push(`ip:${ipHash}`);
  }

  return { keys, deviceId, isNewDeviceCookie };
}

export async function checkLoginLockout(
  db: DbClient,
  keys: string[]
): Promise<{ locked: boolean; lockedUntil: number | null }> {
  if (keys.length === 0) {
    return { locked: false, lockedUntil: null };
  }

  const now = Date.now();
  const rows = await db
    .select()
    .from(loginAttempts)
    .where(inArray(loginAttempts.key, keys));

  let maxLockedUntil: number | null = null;
  const expiredKeys: string[] = [];

  for (const row of rows) {
    if (row.lockedUntil) {
      if (row.lockedUntil > now) {
        if (!maxLockedUntil || row.lockedUntil > maxLockedUntil) {
          maxLockedUntil = row.lockedUntil;
        }
      } else {
        expiredKeys.push(row.key);
      }
    }
  }

  if (expiredKeys.length > 0) {
    await db.delete(loginAttempts).where(inArray(loginAttempts.key, expiredKeys));
  }

  // Úklid starých expirovaných zámků v tabulce
  await db.delete(loginAttempts).where(lt(loginAttempts.lockedUntil, now));

  return {
    locked: maxLockedUntil !== null,
    lockedUntil: maxLockedUntil,
  };
}

export async function recordFailedLogin(
  db: DbClient,
  keys: string[]
): Promise<{ failedAttempts: number; remainingAttempts: number; lockedUntil: number | null }> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const rows = await db
    .select()
    .from(loginAttempts)
    .where(inArray(loginAttempts.key, keys));

  const existingByKey = new Map(rows.map((r) => [r.key, r]));
  let maxFailed = 0;

  for (const key of keys) {
    const existing = existingByKey.get(key);
    const activeCount =
      existing && (!existing.lockedUntil || existing.lockedUntil > now)
        ? existing.failedAttempts
        : 0;
    const nextCount = activeCount + 1;
    if (nextCount > maxFailed) {
      maxFailed = nextCount;
    }
  }

  const lockedUntil = maxFailed >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null;

  for (const key of keys) {
    const existing = existingByKey.get(key);
    if (existing) {
      await db
        .update(loginAttempts)
        .set({
          failedAttempts: maxFailed,
          lockedUntil,
          updatedAt: nowIso,
        })
        .where(eq(loginAttempts.key, key));
    } else {
      await db.insert(loginAttempts).values({
        key,
        failedAttempts: maxFailed,
        lockedUntil,
        updatedAt: nowIso,
      });
    }
  }

  return {
    failedAttempts: maxFailed,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - maxFailed),
    lockedUntil,
  };
}

export async function clearLoginAttempts(db: DbClient, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await db.delete(loginAttempts).where(inArray(loginAttempts.key, keys));
}
