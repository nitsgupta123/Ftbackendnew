import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = process.env.API_URL ?? "http://localhost:4000";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_URL || apiTarget;

  return {
    base: "/panel/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
