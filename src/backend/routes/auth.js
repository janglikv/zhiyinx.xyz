import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { bytesToBase64, hashPassword, sha256, verifyPassword } from "../utils/crypto";
import { clearSessionCookie, deleteSession, getCurrentUser, sessionDays, setSessionCookie } from "../utils/session";
import { json } from "../utils/http";
async function handleAuthRoute(request, env, url) {
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
    if (user) {
      const db = getDb(env);
      let items = [];
      try {
        const queryRes = await withDbTimeout(
          db.prepare("SELECT id, item_type, bottom, left FROM user_items WHERE user_id = ?").bind(user.id).all()
        );
        items = queryRes.results || [];
      } catch (e) {
      }
      return json({ authenticated: true, email: user.email, role: user.role, items });
    }
    return json({ authenticated: false, email: null, role: null, items: [] });
  }
  return null;
}
async function register(request, env) {
  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }
  const db = getDb(env);
  let existing;
  try {
    existing = await withDbTimeout(
      db.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first()
    );
  } catch {
    return dbUnavailableResponse();
  }
  if (existing) {
    return json({ error: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55\u3002" }, { status: 409 });
  }
  const password = await hashPassword(body.password);
  const userId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  try {
    await withDbTimeout(
      db.prepare(
        "INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)"
      ).bind(userId, body.email, password.hash, password.salt).run()
    );
    await withDbTimeout(
      db.prepare(
        "INSERT INTO user_items (id, user_id, item_type, bottom, left) VALUES (?, ?, ?, ?, ?)"
      ).bind(itemId, userId, "arrow", "80px", "600px").run()
    );
  } catch (e) {
    return dbUnavailableResponse();
  }
  return json({ ok: true });
}
async function login(request, env) {
  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }
  const db = getDb(env);
  let user;
  try {
    user = await withDbTimeout(
      db.prepare(
        "SELECT id, email, password_hash, salt, role FROM users WHERE email = ?"
      ).bind(body.email).first()
    );
  } catch {
    return dbUnavailableResponse();
  }
  if (!user || !await verifyPassword(body.password, user.salt, user.password_hash)) {
    return json({ error: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF\u3002" }, { status: 401 });
  }
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1e3).toISOString();
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
async function readCredentials(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Invalid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const { email, password } = body;
  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  return { ok: true, email: email.trim().toLowerCase(), password };
}
export {
  handleAuthRoute
};
