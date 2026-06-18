import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { hashPassword } from "../utils/crypto";
import { json } from "../utils/http";
import { getCurrentUser } from "../utils/session";
async function handleAdminRoute(request, env, url) {
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
  if (request.method === "POST" && url.pathname === "/api/admin/users/update-item") {
    return updateUserItem(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/users/add-item") {
    return addUserItem(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/users/delete-item") {
    return deleteUserItem(request, env);
  }
  return null;
}
async function listUsers(env) {
  const db = getDb(env);
  try {
    const usersResult = await withDbTimeout(
      db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").run()
    );
    const users = usersResult.results || [];
    const itemsResult = await withDbTimeout(
      db.prepare("SELECT id, user_id, item_type, bottom, left FROM user_items").run()
    );
    const items = itemsResult.results || [];
    const usersWithItems = users.map((user) => {
      const userItems = items.filter((item) => item.user_id === user.id);
      return {
        ...user,
        items: userItems.map((item) => ({
          id: item.id,
          item_type: item.item_type,
          bottom: item.bottom,
          left: item.left
        }))
      };
    });
    return json({ users: usersWithItems });
  } catch {
    return dbUnavailableResponse();
  }
}
async function resetUserPassword(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { userId, newPassword } = body;
  if (typeof userId !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    return json({ error: "\u7528\u6237 ID \u65E0\u6548\uFF0C\u6216\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 8 \u4F4D" }, { status: 400 });
  }
  const db = getDb(env);
  try {
    const targetUser = await withDbTimeout(
      db.prepare("SELECT email, role FROM users WHERE id = ?").bind(userId).first()
    );
    if (!targetUser) {
      return json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" }, { status: 404 });
    }
    if (targetUser.role === "admin") {
      return json({ error: "\u4E0D\u5141\u8BB8\u91CD\u7F6E\u7BA1\u7406\u5458\u7528\u6237\u7684\u5BC6\u7801" }, { status: 400 });
    }
    const password = await hashPassword(newPassword);
    await withDbTimeout(
      db.prepare(
        "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?"
      ).bind(password.hash, password.salt, userId).run()
    );
    await withDbTimeout(db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run());
    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}
async function deleteUser(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { userId } = body;
  if (typeof userId !== "string") {
    return json({ error: "\u7528\u6237 ID \u65E0\u6548" }, { status: 400 });
  }
  const db = getDb(env);
  try {
    const targetUser = await withDbTimeout(
      db.prepare("SELECT email, role FROM users WHERE id = ?").bind(userId).first()
    );
    if (!targetUser) {
      return json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" }, { status: 404 });
    }
    if (targetUser.role === "admin") {
      return json({ error: "\u4E0D\u80FD\u5220\u9664\u7BA1\u7406\u5458\u8D26\u53F7" }, { status: 400 });
    }
    await withDbTimeout(db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run());
    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}
async function updateUserItem(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { itemId, bottom, left } = body;
  if (typeof itemId !== "string" || typeof bottom !== "string" || typeof left !== "string") {
    return json({ error: "\u53C2\u6570\u65E0\u6548" }, { status: 400 });
  }
  const db = getDb(env);
  try {
    await withDbTimeout(
      db.prepare("UPDATE user_items SET bottom = ?, left = ? WHERE id = ?").bind(bottom, left, itemId).run()
    );
    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}
async function addUserItem(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { userId, itemType, bottom, left } = body;
  if (typeof userId !== "string" || typeof itemType !== "string" || typeof bottom !== "string" || typeof left !== "string") {
    return json({ error: "\u53C2\u6570\u65E0\u6548" }, { status: 400 });
  }
  const db = getDb(env);
  try {
    const newId = crypto.randomUUID();
    await withDbTimeout(
      db.prepare("INSERT INTO user_items (id, user_id, item_type, bottom, left) VALUES (?, ?, ?, ?, ?)").bind(newId, userId, itemType, bottom, left).run()
    );
    return json({ ok: true, itemId: newId });
  } catch {
    return dbUnavailableResponse();
  }
}
async function deleteUserItem(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { itemId } = body;
  if (typeof itemId !== "string") {
    return json({ error: "\u7269\u54C1 ID \u65E0\u6548" }, { status: 400 });
  }
  const db = getDb(env);
  try {
    await withDbTimeout(
      db.prepare("DELETE FROM user_items WHERE id = ?").bind(itemId).run()
    );
    return json({ ok: true });
  } catch {
    return dbUnavailableResponse();
  }
}
export {
  handleAdminRoute
};
