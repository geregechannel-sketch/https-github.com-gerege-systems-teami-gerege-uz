import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxies the API to the live server so `npm run dev` works without a local backend.
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/ec3api": { target: "https://toshi.gerege.mn", changeOrigin: true, secure: true },
      "/health": { target: "https://toshi.gerege.mn", changeOrigin: true, secure: true },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
