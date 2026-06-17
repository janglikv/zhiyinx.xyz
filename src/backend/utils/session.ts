import type { Env, User } from "../types";
import { getDb, withDbTimeout } from "./db";
import { sha256 } from "./crypto";

export const sessionDays = 7;
const sessionCookieName = "zhiyinx_session";

export async function getCurrentUser(request: Request, env: Env): Promise<Pick<User, "id" | "email" | "role"> | null> {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return null;
  }

  let session: Pick<User, "id" | "email" | "role"> | null;
  try {
    const db = getDb(env);
    session = await withDbTimeout(
      db.prepare(
        `SELECT users.id, users.email, users.role
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?
         LIMIT 1`
      ).bind(await sha256(token), new Date().toISOString()).first<Pick<User, "id" | "email" | "role">>()
    );
  } catch {
    return null;
  }

  return session ?? null;
}

export async function deleteSession(request: Request, env: Env): Promise<void> {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return;
  }

  try {
    await withDbTimeout(getDb(env).prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run());
  } catch {
    // 退出时优先清理浏览器 cookie，远程 D1 临时不可用不阻断用户退出。
  }
}

export function setSessionCookie(token: string, secure: boolean): Headers {
  const headers = new Headers();
  const securePart = secure ? " Secure;" : "";
  headers.set(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly;${securePart} SameSite=Lax; Path=/; Max-Age=${sessionDays * 24 * 60 * 60}`
  );
  return headers;
}

export function clearSessionCookie(): Headers {
  const headers = new Headers();
  headers.set("Set-Cookie", `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return headers;
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  const cookies = header.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
