import { handleAdminRoute } from "./backend/routes/admin";
import { handleAuthRoute } from "./backend/routes/auth";
import { handlePostsRoute } from "./backend/routes/posts";
var stdin_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
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
    const postsResponse = await handlePostsRoute(request, env, url);
    if (postsResponse) {
      return postsResponse;
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  stdin_default as default
};
