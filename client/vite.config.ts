import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// .env 는 저장소 루트 한 곳에만 둔다 (VITE_ 접두사가 붙은 값만 브라우저에 노출된다).
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  envDir: repoRoot,
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
