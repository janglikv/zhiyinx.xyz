import type { Env } from "../types";
import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { hashPassword } from "../utils/crypto";
import { json } from "../utils/http";
import { getCurrentUser } from "../utils/session";

export async function handleAdminRoute(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/admin/")) {
    return null;
  }

  const user = await getCurrentUser(request, env);
  if (!user || user.role !== "admin") {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/users") {
    return listUsers(env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/users/reset-password") {
    return resetUserPassword(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/users/delete") {
    return deleteUser(request, env);
  }

  return null;
}

async function listUsers(env: Env): Promise<Response> {
  const db = getDb(env);
  try {
    const result = await withDbTimeout(
      db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").run()
    );
    return json({ users: result.results || [] });
  } catch {
    return dbUnavailableResponse();
  }
}

async function resetUserPassword(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, newPassword } = body as { userId?: unknown; newPassword?: unknown };
  if (typeof userId !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    return json({ error: "用户 ID 无效，或密码长度不能少于 8 位" }, { status: 400 });
  }

  const db = getDb(env);
  try {
    const targetUser = await withDbTimeout(
      db.prepare("SELECT email, role FROM users WHERE id = ?").bind(userId).first<{ email: string; role: string }>()
    );
    if (!targetUser) {
      return json({ error: "用户不存在" }, { status: 404 });
    }
    if (targetUser.role === "admin") {
      return json({ error: "不允许重置管理员用户的密码" }, { status: 400 });
    }

    const password = await hashPassword(newPassword);
    await withDbTimeout(
      db.prepare(
        "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?"
      ).bind(password.hash, password.salt, userId).run()
    );

    // 重置密码后立即清除该用户所有活跃 session，避免旧凭证继续可用。
    await withDbTimeout(db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run());

    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}

async function deleteUser(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId } = body as { userId?: unknown };
  if (typeof userId !== "string") {
    return json({ error: "用户 ID 无效" }, { status: 400 });
  }

  const db = getDb(env);
  try {
    const targetUser = await withDbTimeout(
      db.prepare("SELECT email, role FROM users WHERE id = ?").bind(userId).first<{ email: string; role: string }>()
    );
    if (!targetUser) {
      return json({ error: "用户不存在" }, { status: 404 });
    }
    if (targetUser.role === "admin") {
      return json({ error: "不能删除管理员账号" }, { status: 400 });
    }

    await withDbTimeout(db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run());

    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}
