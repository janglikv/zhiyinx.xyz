interface Env {
  DB: D1Database;
  USE_REMOTE_D1_HTTP?: string;
  CF_ACCOUNT_ID?: string;
  CF_D1_DATABASE_ID?: string;
  CF_API_TOKEN?: string;
}

type User = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
};

const encoder = new TextEncoder();
const sessionCookieName = "zhiyinx_session";
const sessionDays = 7;
const dbTimeoutMs = 8000;
// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100000.
const passwordHashIterations = 100000;

type DbStatement = {
  bind(...values: unknown[]): DbStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
};

type DbClient = {
  prepare(query: string): DbStatement;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(renderHome());
    }

    if (request.method === "GET" && url.pathname === "/app") {
      const user = await getCurrentUser(request, env);
      if (!user) {
        return redirect("/");
      }

      return htmlResponse(renderApp(user.email));
    }

    if (request.method === "GET" && url.pathname === "/admin") {
      const user = await getCurrentUser(request, env);
      if (!user || user.email !== "admin@zhiyinx.xyz") {
        return redirect("/");
      }

      return htmlResponse(renderAdmin(user.email));
    }

    if (request.method === "GET" && url.pathname === "/api/admin/users") {
      const user = await getCurrentUser(request, env);
      if (!user || user.email !== "admin@zhiyinx.xyz") {
        return json({ error: "Forbidden" }, { status: 403 });
      }

      const db = getDb(env);
      try {
        const result = await withDbTimeout(
          db.prepare("SELECT id, email, created_at FROM users ORDER BY created_at DESC").run()
        );
        return json({ users: result.results || [] });
      } catch {
        return dbUnavailableResponse();
      }
    }

    if (request.method === "POST" && url.pathname === "/api/register") {
      return register(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/login") {
      return login(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/logout") {
      await logout(request, env);
      return json({ ok: true }, { headers: clearSessionCookie() });
    }

    if (request.method === "GET" && url.pathname === "/api/me") {
      const user = await getCurrentUser(request, env);
      return json({ authenticated: Boolean(user), email: user?.email ?? null });
    }

    return new Response("Not found", { status: 404 });
  }
};

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
        "SELECT id, email, password_hash, salt FROM users WHERE email = ?"
      ).bind(body.email).first<User>()
    );
  } catch {
    return dbUnavailableResponse();
  }

  if (!user || !(await verifyPassword(body.password, user.salt, user.password_hash))) {
    return json({ error: "Invalid email or password." }, { status: 401 });
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
    { ok: true },
    { headers: setSessionCookie(token, new URL(request.url).protocol === "https:") }
  );
}

async function logout(request: Request, env: Env): Promise<void> {
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

async function getCurrentUser(request: Request, env: Env): Promise<Pick<User, "id" | "email"> | null> {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return null;
  }

  let session: Pick<User, "id" | "email"> | null;
  try {
    const db = getDb(env);
    session = await withDbTimeout(
      db.prepare(
        `SELECT users.id, users.email
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?
         LIMIT 1`
      ).bind(await sha256(token), new Date().toISOString()).first<Pick<User, "id" | "email">>()
    );
  } catch {
    return null;
  }

  return session ?? null;
}

function getDb(env: Env): DbClient {
  if (env.USE_REMOTE_D1_HTTP !== "true") {
    return env.DB;
  }

  if (!env.CF_ACCOUNT_ID || !env.CF_D1_DATABASE_ID || !env.CF_API_TOKEN) {
    throw new Error("Remote D1 HTTP API credentials are not configured.");
  }

  return new HttpD1Database(env.CF_ACCOUNT_ID, env.CF_D1_DATABASE_ID, env.CF_API_TOKEN);
}

class HttpD1Database implements DbClient {
  constructor(
    private readonly accountId: string,
    private readonly databaseId: string,
    private readonly apiToken: string
  ) {}

  prepare(query: string): DbStatement {
    return new HttpD1Statement(this, query);
  }

  async query(sql: string, params: unknown[]): Promise<D1Result> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sql, params })
      }
    );
    const payload = await response.json<{
      success: boolean;
      errors?: Array<{ message?: string }>;
      result?: D1Result[];
    }>();
    const result = payload.result?.[0];

    if (!response.ok || !payload.success || !result?.success) {
      const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ");
      throw new Error(message || "Remote D1 HTTP API request failed.");
    }

    return result;
  }
}

class HttpD1Statement implements DbStatement {
  private params: unknown[] = [];

  constructor(
    private readonly database: HttpD1Database,
    private readonly query: string
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.params = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.database.query(this.query, this.params);
    return (result.results?.[0] as T | undefined) ?? null;
  }

  run(): Promise<D1Result> {
    return this.database.query(this.query, this.params);
  }
}

async function withDbTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Database request timed out.")), dbTimeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function dbUnavailableResponse(): Response {
  return json({ error: "数据库连接失败，请检查远程 D1 配置或连接。" }, { status: 504 });
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

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const hash = await derivePasswordHash(password, saltBytes);

  return { hash, salt };
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actualHash = await derivePasswordHash(password, base64ToBytes(salt));
  return timingSafeEqual(actualHash, expectedHash);
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: passwordHashIterations },
    key,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  const cookies = header.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function setSessionCookie(token: string, secure: boolean): Headers {
  const headers = new Headers();
  const securePart = secure ? " Secure;" : "";
  headers.set(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly;${securePart} SameSite=Lax; Path=/; Max-Age=${sessionDays * 24 * 60 * 60}`
  );
  return headers;
}

function clearSessionCookie(): Headers {
  const headers = new Headers();
  headers.set("Set-Cookie", `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return headers;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function json(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(payload), { ...init, headers });
}

function redirect(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: path } });
}

function renderHome(): string {
  return page("登录注册", `
    <main class="shell">
      <section class="panel">
        <div>
          <p class="eyebrow">zhiyinx.xyz</p>
          <h1>登录 / 注册</h1>
          <p class="muted">新用户请先注册账号，注册完成后再使用同一邮箱和密码登录。</p>
        </div>
        <form id="auth-form">
          <label>
            邮箱
            <input name="email" type="email" autocomplete="email" required />
          </label>
          <label>
            密码
            <input name="password" type="password" autocomplete="current-password" minlength="8" required />
          </label>
          <div class="actions">
            <button type="submit" data-action="login">登录</button>
            <button type="submit" data-action="register">注册</button>
          </div>
          <p id="message" class="message" role="status"></p>
        </form>
      </section>
    </main>
    <script>
      const form = document.querySelector("#auth-form");
      const message = document.querySelector("#message");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const action = event.submitter?.dataset.action || "login";
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(action === "register" ? "/api/register" : "/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok) {
          message.textContent = result.error || "请求失败";
          return;
        }

        if (action === "register") {
          message.textContent = "注册成功，请点击登录。";
          return;
        }

        location.href = "/app";
      });
    </script>
  `);
}

function renderApp(email: string): string {
  const isAdmin = email === "admin@zhiyinx.xyz";
  const adminAction = isAdmin ? `
    <button id="go-admin" type="button" class="btn-secondary">管理后台</button>
  ` : "";
  const adminScript = isAdmin ? `
    document.querySelector("#go-admin")?.addEventListener("click", () => {
      location.href = "/admin";
    });
  ` : "";

  return page("控制台", `
    <main class="shell">
      <section class="panel">
        <p class="eyebrow">zhiyinx.xyz</p>
        <h1>控制台</h1>
        <p class="muted">当前登录账号：${escapeHtml(email)}</p>
        <div class="actions-vertical">
          <button id="logout" type="button">退出登录</button>
          ${adminAction}
        </div>
      </section>
    </main>
    <script>
      document.querySelector("#logout").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST" });
        location.href = "/";
      });
      ${adminScript}
    </script>
  `);
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | zhiyinx.xyz</title>
    <style>
      :root {
        color: #172033;
        background: #f5f7fb;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
      }
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .panel {
        width: min(100%, 420px);
        background: #ffffff;
        border: 1px solid #dbe2ee;
        border-radius: 8px;
        padding: 28px;
        box-shadow: 0 18px 42px rgba(23, 32, 51, 0.08);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
        line-height: 1.2;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: #4c6fff;
        font-size: 13px;
        font-weight: 700;
      }
      .muted {
        margin: 0 0 22px;
        color: #5d687a;
        line-height: 1.6;
      }
      form,
      label {
        display: grid;
        gap: 8px;
      }
      form {
        gap: 16px;
      }
      label {
        color: #344054;
        font-size: 14px;
        font-weight: 600;
      }
      input {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 12px 14px;
        color: #172033;
        font: inherit;
      }
      input:focus {
        border-color: #4c6fff;
        outline: 3px solid rgba(76, 111, 255, 0.15);
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      button {
        border: 0;
        border-radius: 6px;
        padding: 12px 14px;
        background: #172033;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      button[data-action="register"] {
        background: #eef2ff;
        color: #263a8a;
      }
      .actions-vertical {
        display: grid;
        gap: 10px;
      }
      button.btn-secondary {
        background: #eef2ff;
        color: #263a8a;
      }
      .message {
        min-height: 22px;
        margin: 0;
        color: #b42318;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



function renderAdmin(email: string): string {
  return page("管理员后台", `
    <div class="admin-container">
      <!-- 头部导航 -->
      <header class="admin-header">
        <div class="brand">
          <span class="logo-icon">⚡</span>
          <div class="brand-text">
            <h2>Zhiyinx Admin</h2>
            <span class="badge">系统管理员</span>
          </div>
        </div>
        <div class="user-menu">
          <span class="user-email">\${escapeHtml(email)}</span>
          <a href="/app" class="nav-link">控制台</a>
          <button id="logout-btn" class="logout-sm">退出</button>
        </div>
      </header>

      <main class="admin-main">
        <!-- 统计面板 -->
        <section class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon users-icon">👥</div>
            <div class="stat-info">
              <span class="stat-label">用户总数</span>
              <h3 id="total-users-count">-</h3>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon active-icon">✨</div>
            <div class="stat-info">
              <span class="stat-label">今日新增</span>
              <h3 id="today-users-count">-</h3>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon status-icon">🛡️</div>
            <div class="stat-info">
              <span class="stat-label">系统状态</span>
              <h3 class="status-online">运行中</h3>
            </div>
          </div>
        </section>

        <!-- 表格面板 -->
        <section class="table-card">
          <div class="table-header">
            <div class="title-area">
              <h3>用户目录</h3>
              <p class="subtitle">管理和查看所有已注册的用户账号</p>
            </div>
            <div class="action-area">
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="search-input" placeholder="搜索用户邮箱..." />
              </div>
              <button id="refresh-btn" class="btn-refresh" title="刷新数据">
                <svg class="refresh-svg" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 6a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="user-table">
              <thead>
                <tr>
                  <th>用户 ID</th>
                  <th>电子邮箱</th>
                  <th>注册时间</th>
                </tr>
              </thead>
              <tbody id="user-table-body">
                <tr>
                  <td colspan="3" class="text-center">
                    <div class="loading-spinner"></div>
                    <span class="loading-text">正在加载用户数据...</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="table-footer">
            <span>显示 <span id="filtered-count">0</span> / <span id="total-count">0</span> 个用户</span>
          </div>
        </section>
      </main>
    </div>

    <!-- 简易 Toast 提示 -->
    <div id="toast" class="toast">已复制到剪贴板</div>

    <style>
      :root {
        --primary-color: #4c6fff;
        --primary-hover: #3b5bdb;
        --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        --card-bg: rgba(255, 255, 255, 0.95);
        --text-main: #0f172a;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --success-color: #10b981;
      }

      body {
        background: var(--bg-gradient);
        color: var(--text-main);
        min-height: 100vh;
      }

      .admin-container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 16px;
      }

      /* Header */
      .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--card-bg);
        padding: 16px 24px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        margin-bottom: 24px;
        backdrop-filter: blur(8px);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo-icon {
        font-size: 24px;
        background: #e0e7ff;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        color: var(--primary-color);
      }

      .brand-text h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.2;
      }

      .badge {
        font-size: 11px;
        background: #e0f2fe;
        color: #0369a1;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .user-menu {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .user-email {
        font-size: 14px;
        color: var(--text-muted);
        font-weight: 500;
      }

      .nav-link {
        color: var(--primary-color);
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        transition: color 0.2s;
      }

      .nav-link:hover {
        color: var(--primary-hover);
      }

      .logout-sm {
        background: #f1f5f9;
        color: #475569;
        font-size: 13px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .logout-sm:hover {
        background: #ffe4e6;
        color: #b91c1c;
        border-color: #fca5a5;
      }

      /* Main Content */
      .admin-main {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }

      .stat-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
      }

      .stat-icon {
        font-size: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: grid;
        place-items: center;
      }

      .users-icon { background: #e0e7ff; color: #4338ca; }
      .active-icon { background: #ecfdf5; color: #047857; }
      .status-icon { background: #fef3c7; color: #b45309; }

      .stat-info {
        display: flex;
        flex-direction: column;
      }

      .stat-label {
        font-size: 13px;
        color: var(--text-muted);
        font-weight: 500;
      }

      .stat-info h3 {
        margin: 4px 0 0;
        font-size: 22px;
        font-weight: 700;
      }

      .status-online {
        color: var(--success-color);
      }

      /* Table Card */
      .table-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        overflow: hidden;
      }

      .table-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }

      .title-area h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }

      .subtitle {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--text-muted);
      }

      .action-area {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 12px;
        color: var(--text-muted);
        font-size: 14px;
        pointer-events: none;
      }

      .search-box input {
        padding: 8px 12px 8px 36px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        width: 220px;
        background: #f8fafc;
        transition: all 0.2s;
      }

      .search-box input:focus {
        background: #fff;
        width: 280px;
        border-color: var(--primary-color);
        outline: none;
        box-shadow: 0 0 0 3px rgba(76, 111, 255, 0.15);
      }

      .btn-refresh {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid var(--border-color);
        width: 38px;
        height: 38px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        cursor: pointer;
        padding: 0;
        transition: all 0.2s;
      }

      .btn-refresh:hover {
        background: #e2e8f0;
        color: var(--text-main);
      }

      .refresh-svg {
        transition: transform 0.5s ease;
      }

      .btn-refresh.spinning .refresh-svg {
        transform: rotate(360deg);
      }

      /* Table Styles */
      .table-wrapper {
        overflow-x: auto;
      }

      .user-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 14px;
      }

      .user-table th {
        background: #f8fafc;
        padding: 12px 24px;
        font-weight: 600;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-color);
      }

      .user-table td {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-color);
      }

      .user-table tbody tr {
        transition: background-color 0.15s;
      }

      .user-table tbody tr:hover {
        background-color: #f8fafc;
      }

      .text-center {
        text-align: center;
        padding: 40px 0 !important;
      }

      /* Copy ID badge */
      .id-badge {
        font-family: monospace;
        background: #f1f5f9;
        color: #475569;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        border: 1px solid #e2e8f0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s;
      }

      .id-badge:hover {
        background: #e2e8f0;
        color: var(--primary-color);
        border-color: #cbd5e1;
      }

      .id-badge::after {
        content: "📋";
        font-size: 10px;
        opacity: 0.6;
      }

      /* Spinner */
      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #e2e8f0;
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 12px;
      }

      .loading-text {
        font-size: 13px;
        color: var(--text-muted);
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .table-footer {
        padding: 14px 24px;
        background: #f8fafc;
        border-top: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-muted);
      }

      /* Toast */
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: #fff;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        z-index: 1000;
      }

      .toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      @media (max-width: 640px) {
        .admin-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
        }
        .user-menu {
          width: 100%;
          justify-content: space-between;
        }
        .table-header {
          flex-direction: column;
          align-items: stretch;
        }
        .search-box input {
          width: 100%;
        }
        .search-box input:focus {
          width: 100%;
        }
      }
    </style>

    <script>
      let usersData = [];

      async function fetchUsers() {
        const refreshBtn = document.querySelector("#refresh-btn");
        refreshBtn.classList.add("spinning");
        
        try {
          const response = await fetch("/api/admin/users");
          if (!response.ok) {
            throw new Error("Failed to fetch users");
          }
          const data = await response.json();
          usersData = data.users || [];
          
          updateStats();
          renderTable(usersData);
        } catch (error) {
          console.error(error);
          document.querySelector("#user-table-body").innerHTML = \`
            <tr>
              <td colspan="3" class="text-center" style="color: #ef4444;">
                ⚠️ 加载数据失败，请检查数据库连接或重新登录。
              </td>
            </tr>
          \`;
        } finally {
          setTimeout(() => {
            refreshBtn.classList.remove("spinning");
          }, 500);
        }
      }

      function updateStats() {
        document.querySelector("#total-count").textContent = usersData.length;
        document.querySelector("#total-users-count").textContent = usersData.length;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = usersData.filter(user => {
          if (!user.created_at) return false;
          return user.created_at.startsWith(todayStr);
        }).length;
        
        document.querySelector("#today-users-count").textContent = todayCount;
      }

      function renderTable(users) {
        const tbody = document.querySelector("#user-table-body");
        document.querySelector("#filtered-count").textContent = users.length;

        if (users.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="3" class="text-center">
                📭 暂无用户数据
              </td>
            </tr>
          \`;
          return;
        }

        tbody.innerHTML = users.map(user => {
          const formattedDate = formatDate(user.created_at);
          const shortId = user.id.substring(0, 8) + '...';
          return \`
            <tr>
              <td>
                <span class="id-badge" onclick="copyToClipboard('\${user.id}')" title="点击复制完整 ID">\${shortId}</span>
              </td>
              <td style="font-weight: 500;">\${escapeHtml(user.email)}</td>
              <td style="color: #64748b;">\${formattedDate}</td>
            </tr>
          \`;
        }).join('');
      }

      function formatDate(dateStr) {
        if (!dateStr) return "-";
        try {
          const date = new Date(dateStr.replace(" ", "T") + "Z");
          if (isNaN(date.getTime())) {
            return dateStr;
          }
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch {
          return dateStr;
        }
      }

      function escapeHtml(str) {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast();
        });
      }

      function showToast() {
        const toast = document.querySelector("#toast");
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
        }, 2000);
      }

      document.querySelector("#search-input").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = usersData.filter(user => 
          user.email.toLowerCase().includes(query) || 
          user.id.toLowerCase().includes(query)
        );
        renderTable(filtered);
      });

      document.querySelector("#refresh-btn").addEventListener("click", fetchUsers);

      document.querySelector("#logout-btn").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST" });
        location.href = "/";
      });

      fetchUsers();
    </script>
  `);
}
