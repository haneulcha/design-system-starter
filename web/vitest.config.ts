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
    // globals는 vitest.setup.ts가 아니라 여기서만 켜져 있어도 된다 — 지우지 말 것:
    // @testing-library/react의 자동 cleanup이 전역 afterEach를 등록하는데,
    // 그게 걸리려면 이 옵션이 켜져 있어야 한다. 테스트 파일이 describe/it/expect를
    // 명시적으로 import해도 이 옵션은 그것과 별개로 필요하다.
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
