import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Development uses a local backend; production is never the default test target.
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/ec3api": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8080", changeOrigin: true },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
