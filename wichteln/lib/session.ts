import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { findUser, getDb } from "./store";

export type Session = { role: "admin" } | { role: "user"; groupId: string; userId: string };

const COOKIE = "wichtel_session";
const SECRET_FILE = path.join(process.cwd(), "data", ".secret");

let cachedSecret: string | undefined;

async function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  try {
    cachedSecret = (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    cachedSecret = crypto.randomBytes(32).toString("hex");
    await fs.mkdir(path.dirname(SECRET_FILE), { recursive: true });
    await fs.writeFile(SECRET_FILE, cachedSecret, "utf8");
  }
  return cachedSecret;
}

async function sign(value: string) {
  return crypto.createHmac("sha256", await getSecret()).update(value).digest("base64url");
}

export async function setSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/");
}

export async function requireUser() {
  const s = await getSession();
  if (s?.role !== "user") redirect("/");
  const found = findUser(await getDb(), s.groupId, s.userId);
  if (!found) redirect("/");
  return { session: s, ...found };
}

export function adminCredentials() {
  return {
    user: process.env.ADMIN_USER || "admin",
    password: process.env.ADMIN_PASSWORD || "admin",
  };
}
