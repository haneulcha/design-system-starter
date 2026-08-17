import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // GitHub Pages 프로젝트 사이트는 리포 이름 서브패스에 올라간다. dev에도 똑같이
  // 걸어 두는 건 일부러다 — 라우팅이 손으로 짠 pathname 비교라(App.tsx) 루트에서만
  // 개발하면 base 관련 버그가 배포 후에야 드러난다. dev 주소도 /design-system-starter/.
  base: "/design-system-starter/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
    },
  },
});
