import { defineConfig, runnerImport } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "path";

// 도구 화면 크롬이 먹을 --ds-* 토큰을 스키마에서 생성한다. buildStart는 dev 서버
// 시작과 vite build 양쪽에서 돌아서 별도 실행 단계가 필요 없다 — web/에 tsx가 없고
// 루트(pnpm)와 web이 별도 패키지라 predev 스크립트는 두 패키지를 얽히게 만든다.
// 내용이 같으면 안 쓴다: 매 시작마다 mtime이 바뀌면 무의미한 HMR이 돈다.
//
// tokensCss.ts를 이 파일 최상단에서 정적 import하면 실패한다: vite.config.ts
// 자신을 읽어들이는 esbuild 번들링 단계는 아직 존재하지 않는 이 config의
// resolve.alias를 쓸 수 없어서, tokensCss.ts가 여는 "@core/*" 별칭을 풀지 못하고
// Node가 그대로 "@core/generator/..."를 패키지명으로 착각해 죽는다(닭과 달걀).
// vite가 공개 API로 내보내는 runnerImport로 별도의 인라인 설정(별칭 포함)을 만들어
// 이 모듈 하나만 그 안에서 실행해 우회한다.
function dsTokens() {
  return {
    name: "ds-tokens",
    async buildStart() {
      const modulePath = path.resolve(__dirname, "src/tokens/tokensCss.ts");
      const { module } = await runnerImport(modulePath, {
        resolve: {
          alias: {
            "@core": path.resolve(__dirname, "../src"),
            "@data": path.resolve(__dirname, "../data"),
          },
        },
      });
      const out = path.resolve(__dirname, "src/tokens.generated.css");
      const next = module.renderTokensCss();
      const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : null;
      if (prev !== next) fs.writeFileSync(out, next);
    },
  };
}

export default defineConfig({
  // GitHub Pages 프로젝트 사이트는 리포 이름 서브패스에 올라간다. dev에도 똑같이
  // 걸어 두는 건 일부러다 — 라우팅이 손으로 짠 pathname 비교라(App.tsx) 루트에서만
  // 개발하면 base 관련 버그가 배포 후에야 드러난다. dev 주소도 /design-system-starter/.
  base: "/design-system-starter/",
  plugins: [dsTokens(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
    },
  },
});
