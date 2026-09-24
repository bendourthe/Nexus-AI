import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

/*
 * v2.4.11 -- the build's identity, injected for the renderer.
 *
 * Operator instruction: a "do not show again" choice must not survive a new
 * install ("after each new install, this should be turned back to default").
 * Preferences that suppress a dialog are therefore stamped with this, and a
 * value stamped by a different build reads as unset. The timestamp makes every
 * BUILD distinct, so reinstalling the same version still resets.
 */
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version?: string };
const buildId = `${pkg.version ?? "0.0.0"}+${Date.now()}`;

// Tauri expects a fixed port and a known host so the Rust dev runner can attach.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  define: {
    __NEXUS_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "dist",
    target: "esnext",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
