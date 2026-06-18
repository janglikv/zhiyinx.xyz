import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var stdin_default = defineConfig(({ mode }) => {
  const isRemote = mode === "remote";
  const port = isRemote ? 8790 : 8787;
  const backendPort = isRemote ? 8888 : 7777;
  return {
    plugins: [react()],
    server: {
      port,
      host: "0.0.0.0",
      // 允许绑定到所有网卡，以便支持自定义本地域名访问
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: "dist"
    }
  };
});
export {
  stdin_default as default
};
