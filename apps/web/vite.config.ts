import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const gateway = process.env.VITE_API_GATEWAY_URL ?? "http://127.0.0.1:4002";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "../..",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: gateway, changeOrigin: true },
      "/health": { target: gateway, changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
