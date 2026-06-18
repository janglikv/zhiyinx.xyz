import { dbUnavailableResponse, getDb, withDbTimeout } from "../utils/db";
import { getCurrentUser } from "../utils/session";
import { json } from "../utils/http";
async function handlePostsRoute(request, env, url) {
  if (request.method === "GET" && url.pathname === "/api/posts") {
    return getPosts(request, env, url);
  }
  if (request.method === "POST" && url.pathname === "/api/posts/click") {
    return recordClick(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/posts/favorite") {
    return toggleFavorite(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/comments") {
    return getComments(request, env, url);
  }
  if (request.method === "POST" && url.pathname === "/api/comments") {
    return addComment(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/favorites") {
    return getFavorites(request, env);
  }
  return null;
}
async function getPosts(request, env, url) {
  const category = url.searchParams.get("category");
  const source = url.searchParams.get("source");
  const sort = url.searchParams.get("sort") || "hot";
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
  const params = [];
  if (user) {
    params.push(user.id);
  }
  if (category && category !== "\u5168\u90E8") {
    query += ` AND posts.category = ?`;
    params.push(category);
  }
  if (source && source !== "\u5168\u90E8") {
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
async function recordClick(request, env) {
  let body;
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
    await withDbTimeout(
      db.prepare("UPDATE posts SET clicks = clicks + 1, score = score + 5 WHERE id = ?").bind(body.id).run()
    );
    return json({ ok: true });
  } catch (err) {
    console.error("Record click error:", err);
    return dbUnavailableResponse();
  }
}
async function toggleFavorite(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "\u8BF7\u5148\u767B\u5F55\u540E\u518D\u8FDB\u884C\u6B64\u64CD\u4F5C\u3002" }, { status: 401 });
  }
  let body;
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
        db.prepare("INSERT OR IGNORE INTO favorites (user_id, post_id) VALUES (?, ?)").bind(user.id, body.id).run()
      );
      await withDbTimeout(
        db.prepare("UPDATE posts SET score = score + 20 WHERE id = ?").bind(body.id).run()
      );
    } else {
      await withDbTimeout(
        db.prepare("DELETE FROM favorites WHERE user_id = ? AND post_id = ?").bind(user.id, body.id).run()
      );
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
async function getComments(request, env, url) {
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
    const comments = (result.results || []).map((c) => {
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
async function addComment(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "\u8BF7\u5148\u767B\u5F55\u540E\u518D\u53D1\u8868\u8BC4\u8BBA\u3002" }, { status: 401 });
  }
  let body;
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
      db.prepare("INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)").bind(commentId, body.postId, user.id, content).run()
    );
    await withDbTimeout(
      db.prepare("UPDATE posts SET score = score + 15 WHERE id = ?").bind(body.postId).run()
    );
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
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    console.error("Add comment error:", err);
    return dbUnavailableResponse();
  }
}
async function getFavorites(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return json({ error: "\u8BF7\u5148\u767B\u5F55\u4EE5\u67E5\u770B\u6536\u85CF\u5217\u8868\u3002" }, { status: 401 });
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
export {
  handlePostsRoute
};
