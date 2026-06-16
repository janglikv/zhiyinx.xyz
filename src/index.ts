interface Env {
  DB: D1Database;
}

type User = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
};

const encoder = new TextEncoder();
const sessionCookieName = "zhixinx_session";
const sessionDays = 7;

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

    if (request.method === "POST" && url.pathname === "/api/setup") {
      return setup(request, env);
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

async function setup(request: Request, env: Env): Promise<Response> {
  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) {
    return json({ error: "Setup is already completed." }, { status: 409 });
  }

  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }

  const password = await hashPassword(body.password);
  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), body.email, password.hash, password.salt).run();

  return json({ ok: true });
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readCredentials(request);
  if (!body.ok) {
    return json({ error: body.error }, { status: 400 });
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, salt FROM users WHERE email = ?"
  ).bind(body.email).first<User>();

  if (!user || !(await verifyPassword(body.password, user.salt, user.password_hash))) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), user.id, tokenHash, expiresAt).run();

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

  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

async function getCurrentUser(request: Request, env: Env): Promise<Pick<User, "id" | "email"> | null> {
  const token = getCookie(request.headers.get("Cookie"), sessionCookieName);
  if (!token) {
    return null;
  }

  const session = await env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?
     LIMIT 1`
  ).bind(await sha256(token), new Date().toISOString()).first<Pick<User, "id" | "email">>();

  return session ?? null;
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
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 },
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
  return page("登录", `
    <main class="shell">
      <section class="panel">
        <div>
          <p class="eyebrow">zhixinx.xyz</p>
          <h1>登录</h1>
          <p class="muted">首次使用请先创建管理员账号。创建完成后，继续使用同一表单登录。</p>
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
            <button type="button" data-action="setup">创建管理员</button>
          </div>
          <p id="message" class="message" role="status"></p>
        </form>
      </section>
    </main>
    <script>
      const form = document.querySelector("#auth-form");
      const message = document.querySelector("#message");
      let action = "login";

      document.querySelectorAll("button[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
          action = button.dataset.action;
        });
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(action === "setup" ? "/api/setup" : "/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok) {
          message.textContent = result.error || "请求失败";
          return;
        }

        if (action === "setup") {
          message.textContent = "管理员已创建，请点击登录。";
          action = "login";
          return;
        }

        location.href = "/app";
      });
    </script>
  `);
}

function renderApp(email: string): string {
  return page("控制台", `
    <main class="shell">
      <section class="panel">
        <p class="eyebrow">zhixinx.xyz</p>
        <h1>控制台</h1>
        <p class="muted">当前登录账号：${escapeHtml(email)}</p>
        <button id="logout" type="button">退出登录</button>
      </section>
    </main>
    <script>
      document.querySelector("#logout").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST" });
        location.href = "/";
      });
    </script>
  `);
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | zhixinx.xyz</title>
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
      button[data-action="setup"] {
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
