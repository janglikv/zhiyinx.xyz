import { getDb, withDbTimeout } from "./db";
import { sha256 } from "./crypto";
const sessionDays = 7;
const sessionCookieName = "zhiyinx_session";
async function getCurrentUser(request, env) {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return null;
  }
  let session;
  try {
    const db = getDb(env);
    session = await withDbTimeout(
      db.prepare(
        `SELECT users.id, users.email, users.role
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?
         LIMIT 1`
      ).bind(await sha256(token), (/* @__PURE__ */ new Date()).toISOString()).first()
    );
  } catch {
    return null;
  }
  return session ?? null;
}
async function deleteSession(request, env) {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return;
  }
  try {
    await withDbTimeout(getDb(env).prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run());
  } catch {
  }
}
function setSessionCookie(token, secure) {
  const headers = new Headers();
  const securePart = secure ? " Secure;" : "";
  headers.set(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly;${securePart} SameSite=Lax; Path=/; Max-Age=${sessionDays * 24 * 60 * 60}`
  );
  return headers;
}
function clearSessionCookie() {
  const headers = new Headers();
  headers.set("Set-Cookie", `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return headers;
}
function getCookie(header, name) {
  if (!header) {
    return null;
  }
  const cookies = header.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
export {
  clearSessionCookie,
  deleteSession,
  getCurrentUser,
  sessionDays,
  setSessionCookie
};
