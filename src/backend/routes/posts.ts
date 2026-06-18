import type { Env } from "../types";
import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { getCurrentUser } from "../utils/session";
import { json } from "../utils/http";

export async function handlePostsRoute(request: Request, env: Env, url: URL): Promise<Response | null> {
  // 1. 获取帖子列表
  if (request.method === "GET" && url.pathname === "/api/posts") {
    return getPosts(request, env, url);
  }

  // 2. 点击帖子 (增加点击量和热度)
  if (request.method === "POST" && url.pathname === "/api/posts/click") {
    return recordClick(request, env);
  }

  // 3. 收藏/取消收藏帖子
  if (request.method === "POST" && url.pathname === "/api/posts/favorite") {
    return toggleFavorite(request, env);
  }

  // 4. 获取帖子的评论列表
  if (request.method === "GET" && url.pathname === "/api/comments") {
    return getComments(request, env, url);
  }

  // 5. 发表评论
  if (request.method === "POST" && url.pathname === "/api/comments") {
    return addComment(request, env);
  }

  // 6. 获取我的收藏列表
  if (request.method === "GET" && url.pathname === "/api/favorites") {
    return getFavorites(request, env);
  }

  return null;
}

// 获取帖子列表
async function getPosts(request: Request, env: Env, url: URL): Promise<Response> {
  const category = url.searchParams.get("category");
  const source = url.searchParams.get("source");
  const sort = url.searchParams.get("sort") || "hot"; // hot | new

  const user = await getCurrentUser(request, env);
  const db = getDb(env);

  let query = `
    SELECT posts.*, 
           (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comment_count
  `;

  if (user) {
    query += `, EXISTS(SELECT 1 FROM favorites WHERE favorites.post_id = posts.id AND favorites.user_id = ?) AS is_favorited`;
  } else {
    query += `, 0 AS is_favorited`;
  }

  query += ` FROM posts WHERE 1=1`;

  const params: unknown[] = [];
  if (user) {
    params.push(user.id);
  }

  if (category && category !== "全部") {
    query += ` AND posts.category = ?`;
    params.push(category);
  }

  if (source && source !== "全部") {
    query += ` AND posts.source = ?`;
    params.push(source);
  }

  if (sort === "new") {
    query += ` ORDER BY posts.created_at DESC`;
  } else {
    query += ` ORDER BY posts.score DESC, posts.created_at DESC`;
  }

  try {
    const statement = db.prepare(query);
    const result = await withDbTimeout(statement.bind(...params).run());
    return json({ posts: result.results || [] });
  } catch (err) {
    console.error("Get posts error:", err);
    return dbUnavailableResponse();
  }
}

// 记录点击
async function recordClick(request: Request, env: Env): Promise<Response> {
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id) {
    return json({ error: "Post ID is required" }, { status: 400 });
  }

  const db = getDb(env);
  try {
    // 每次点击增加 clicks，并且增加 score 热度
    await withDbTimeout(
      db.prepare("UPDATE posts SET clicks = clicks + 1, score = score + 5 WHERE id = ?").bind(body.id).run()
    );
    return json({ ok: true });
  } catch (err) {
    console.error("Record click error:", err);
    return dbUnavailableResponse();
  }
}

// 收藏/取消收藏
async function toggleFavorite(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "请先登录后再进行此操作。" }, { status: 401 });
  }

  let body: { id?: string; action?: "add" | "remove" };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id || !body.action) {
    return json({ error: "Post ID and action are required" }, { status: 400 });
  }

  const db = getDb(env);
  try {
    if (body.action === "add") {
      await withDbTimeout(
        db.prepare("INSERT OR IGNORE INTO favorites (user_id, post_id) VALUES (?, ?)")
          .bind(user.id, body.id)
          .run()
      );
      // 增加收藏也给帖子加点热度 (加 20 分)
      await withDbTimeout(
        db.prepare("UPDATE posts SET score = score + 20 WHERE id = ?").bind(body.id).run()
      );
    } else {
      await withDbTimeout(
        db.prepare("DELETE FROM favorites WHERE user_id = ? AND post_id = ?")
          .bind(user.id, body.id)
          .run()
      );
      // 取消收藏扣除热度
      await withDbTimeout(
        db.prepare("UPDATE posts SET score = MAX(0, score - 20) WHERE id = ?").bind(body.id).run()
      );
    }
    return json({ ok: true });
  } catch (err) {
    console.error("Toggle favorite error:", err);
    return dbUnavailableResponse();
  }
}

// 获取帖子的评论
async function getComments(request: Request, env: Env, url: URL): Promise<Response> {
  const postId = url.searchParams.get("postId");
  if (!postId) {
    return json({ error: "Post ID is required" }, { status: 400 });
  }

  const db = getDb(env);
  try {
    const result = await withDbTimeout(
      db.prepare(`
        SELECT comments.*, users.email AS user_email
        FROM comments
        JOIN users ON users.id = comments.user_id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at DESC
      `).bind(postId).run()
    );
    
    // 对邮箱做脱敏处理，保护隐私
    const comments = (result.results || []).map((c: any) => {
      const email = c.user_email || "";
      const parts = email.split("@");
      let maskedEmail = email;
      if (parts.length === 2) {
        const name = parts[0];
        const domain = parts[1];
        const maskedName = name.length > 3 ? name.slice(0, 3) + "***" : name + "***";
        maskedEmail = `${maskedName}@${domain}`;
      }
      return {
        ...c,
        user_email: maskedEmail
      };
    });

    return json({ comments });
  } catch (err) {
    console.error("Get comments error:", err);
    return dbUnavailableResponse();
  }
}

// 发表评论
async function addComment(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "请先登录后再发表评论。" }, { status: 401 });
  }

  let body: { postId?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.postId || !body.content || !body.content.trim()) {
    return json({ error: "Post ID and content are required" }, { status: 400 });
  }

  const db = getDb(env);
  const commentId = crypto.randomUUID();
  const content = body.content.trim();

  try {
    await withDbTimeout(
      db.prepare("INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)")
        .bind(commentId, body.postId, user.id, content)
        .run()
    );

    // 发表评论给帖子加点热度 (加 15 分)
    await withDbTimeout(
      db.prepare("UPDATE posts SET score = score + 15 WHERE id = ?").bind(body.postId).run()
    );

    // 对当前用户的 Email 进行脱敏，以便直接返回给前端展示
    const parts = user.email.split("@");
    const maskedName = parts[0].length > 3 ? parts[0].slice(0, 3) + "***" : parts[0] + "***";
    const maskedEmail = `${maskedName}@${parts[1]}`;

    return json({
      ok: true,
      comment: {
        id: commentId,
        post_id: body.postId,
        user_id: user.id,
        user_email: maskedEmail,
        content,
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Add comment error:", err);
    return dbUnavailableResponse();
  }
}

// 获取我的收藏
async function getFavorites(request: Request, env: Env): Promise<Response> {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "请先登录以查看收藏列表。" }, { status: 401 });
  }

  const db = getDb(env);
  try {
    const result = await withDbTimeout(
      db.prepare(`
        SELECT posts.*, 
               1 AS is_favorited,
               (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comment_count
        FROM favorites
        JOIN posts ON posts.id = favorites.post_id
        WHERE favorites.user_id = ?
        ORDER BY favorites.created_at DESC
      `).bind(user.id).run()
    );
    return json({ posts: result.results || [] });
  } catch (err) {
    console.error("Get favorites error:", err);
    return dbUnavailableResponse();
  }
}
