import { handleAdminRoute } from "./backend/routes/admin";
import { handleAuthRoute } from "./backend/routes/auth";
import type { Env } from "./backend/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 前端页面由 Cloudflare Static Assets 托管，Worker 只处理 API。
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }

    const adminResponse = await handleAdminRoute(request, env, url);
    if (adminResponse) {
      return adminResponse;
    }

    const authResponse = await handleAuthRoute(request, env, url);
    if (authResponse) {
      return authResponse;
    }

    return new Response("Not Found", { status: 404 });
  }
};
