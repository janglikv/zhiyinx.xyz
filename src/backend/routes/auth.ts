import type { Env, User } from "../types";
import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { bytesToBase64, hashPassword, sha256, verifyPassword } from "../utils/crypto";
import { clearSessionCookie, deleteSession, getCurrentUser, sessionDays, setSessionCookie } from "../utils/session";
import { json } from "../utils/http";

export async function handleAuthRoute(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method === "POST" && url.pathname === "/api/register") {
    return register(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    return login(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    await deleteSession(request, env);
    return json({ ok: true }, { headers: clearSessionCookie() });
  }

  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = await getCurrentUser(request, env);
    return json({ authenticated: Boolean(user), email: user?.email ?? null, role: user?.role ?? null });
  }

  return null;
}

async function register(request: Request, env: Env): Promise<Response> {
  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }

  const db = getDb(env);
  let existing: { id: string } | null;
  try {
    existing = await withDbTimeout(
      db.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first<{ id: string }>()
    );
  } catch {
    return dbUnavailableResponse();
  }

  if (existing) {
    return json({ error: "该邮箱已注册，请直接登录。" }, { status: 409 });
  }

  const password = await hashPassword(body.password);
  try {
    await withDbTimeout(
      db.prepare(
        "INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), body.email, password.hash, password.salt).run()
    );
  } catch {
    return dbUnavailableResponse();
  }

  return json({ ok: true });
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }

  const db = getDb(env);
  let user: User | null;
  try {
    user = await withDbTimeout(
      db.prepare(
        "SELECT id, email, password_hash, salt, role FROM users WHERE email = ?"
      ).bind(body.email).first<User>()
    );
  } catch {
    return dbUnavailableResponse();
  }

  if (!user || !(await verifyPassword(body.password, user.salt, user.password_hash))) {
    return json({ error: "邮箱或密码错误。" }, { status: 401 });
  }

  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    await withDbTimeout(
      db.prepare(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), user.id, tokenHash, expiresAt).run()
    );
  } catch {
    return dbUnavailableResponse();
  }

  return json(
    { ok: true, role: user.role },
    { headers: setSessionCookie(token, new URL(request.url).protocol === "https:") }
  );
}

async function readCredentials(request: Request): Promise<
  | { ok: true; email: string; password: string }
  | { ok: false; error: string }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Invalid JSON body." };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  return { ok: true, email: email.trim().toLowerCase(), password };
}
