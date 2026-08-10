// web/vitest.config.ts
//
// vite.config.ts를 재사용하지 않고 필요한 것만 다시 쓴다 — tailwind 플러그인은
// 테스트에서 할 일이 없고, 있으면 CSS 파이프라인이 끼어들 여지만 생긴다.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
