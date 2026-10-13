import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";

// Dev proxies the API to the live server so `npm run dev` works without a local backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY || "https://toshi.gerege.mn";
  let commit = env.VITE_BUILD_COMMIT || "unknown";
  if (commit === "unknown") {
    try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  }
  const version = { build_commit: commit, built_at: new Date().toISOString() };
  return {
    plugins: [react(), {
      name: "build-version",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(version) });
      },
    }],
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
