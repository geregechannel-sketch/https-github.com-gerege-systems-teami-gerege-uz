import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxies the API to the live server so `npm run dev` works without a local backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY || "https://toshi.gerege.mn";
  return {
    plugins: [react()],
    base: "/",
    server: {
      proxy: {
        "/ec3api": { target: apiTarget, changeOrigin: true, secure: !apiTarget.startsWith("http://") },
        "/health": { target: apiTarget, changeOrigin: true, secure: !apiTarget.startsWith("http://") },
      },
    },
    build: { outDir: "dist", sourcemap: false },
  };
});
