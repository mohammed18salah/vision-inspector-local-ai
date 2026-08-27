import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "desktop", "renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@vision": path.resolve(import.meta.dirname, "desktop", "renderer", "src"),
    },
  },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: {
    outDir: path.resolve(import.meta.dirname, "desktop", "dist", "renderer"),
    emptyOutDir: false,
  },
});
