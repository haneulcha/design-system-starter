// web/src/tokens/tokensCss.ts
//
// 도구 화면의 크롬이 먹을 CSS를 스키마 v1에서 생성한다. 이 파일은 앱이 import하지
// 않는다 — vite 플러그인(vite.config.ts)만 부르고, 결과는 tokens.generated.css로
// 나간다.
//
// 네임스페이스는 --ds-* 고정이다. Tailwind @theme의 기본 네임스페이스(--text-*
// 등)를 덮으면 global.css를 공유하는 inspector·#lab·#builder가 같이 바뀌어
// "이 화면만"이라는 범위가 거짓이 된다 (스펙 D2).

import { generateSpacingCategory } from "@core/generator/spacing-category.js";
import { generateRadiusCategory } from "@core/generator/radius-category.js";
import { generateElevationCategory } from "@core/generator/elevation-category.js";
import { generateTypographyCategory } from "@core/generator/typography-category.js";

/** 숫자는 px, 문자열("9999px"·"50%")은 그대로 — radius 토큰의 두 종류를 흡수한다. */
function len(v: number | string): string {
  return typeof v === "number" ? `${v}px` : v;
}

/** "heading.sm" → "heading-sm", "badge" → "badge". CSS 식별자에 점이 못 온다. */
function utilityName(profileKey: string): string {
  return profileKey.replace(/\./g, "-");
}

export function renderTokensCss(): string {
  const spacing = generateSpacingCategory({ density: "comfortable" });
  const radius = generateRadiusCategory({ style: "standard" });
  // ringColor를 안 넘긴다 — style="shadow"에서는 쓰이지 않고(elevation-category.ts:141-146),
  // ring 스타일로 knob을 돌리는 것은 이번 범위가 아니다 (스펙 D2).
  const elevation = generateElevationCategory({ style: "shadow", intensity: "subtle" });
  const type = generateTypographyCategory();

  const vars: string[] = [];

  vars.push("  /* spacing — alias만. 원 12-stop 스케일은 내보내지 않는다. */");
  for (const [name, px] of Object.entries(spacing.aliases)) {
    vars.push(`  --ds-space-${name}: ${px}px;`);
  }

  vars.push("", "  /* radius — 이름 토큰 8개. */");
  for (const [name, value] of Object.entries(radius.tokens)) {
    vars.push(`  --ds-radius-${name}: ${len(value)};`);
  }

  vars.push("", "  /* elevation — shadow × subtle, 5레벨. */");
  for (const level of elevation.levels) {
    vars.push(`  --ds-shadow-${level.name}: ${level.shadow};`);
  }

  vars.push("", "  /* font chains */");
  vars.push(`  --ds-font-sans: ${type.fontChains.sans};`);
  vars.push(`  --ds-font-mono: ${type.fontChains.mono};`);

  // 평범한 클래스 셀렉터로 낸다 — @utility는 안 쓴다. 실측(vite plugin ds-tokens
  // 배선, 2026-08-24) 결과 @tailwindcss/vite는 엔트리 CSS가 @import한 파일 안의
  // @utility를 처리하지 않는다: --ds-* 커스텀 프로퍼티는 살아나는데 @utility 블록만
  // 조용히 버려져 클래스가 아무 효과가 없었다. 기능적 차이는 variant(hover:/lg:)
  // 지원뿐이고 이 화면은 타이포에 variant를 쓰지 않는다.
  const utilities = Object.entries(type.profiles).map(([key, p]) => {
    const family = p.fontFamily === type.fontChains.mono ? "mono" : "sans";
    return [
      `.ds-type-${utilityName(key)} {`,
      `  font-family: var(--ds-font-${family});`,
      `  font-size: ${p.size}px;`,
      `  font-weight: ${p.weight};`,
      `  line-height: ${p.lineHeight};`,
      `  letter-spacing: ${p.letterSpacing};`,
      `}`,
    ].join("\n");
  });

  return [
    "/* 생성 파일 — 직접 고치지 말 것.",
    " * 출처: src/schema/{spacing,radius,elevation,typography}.ts (v1)",
    " * 생성기: web/src/tokens/tokensCss.ts, vite 플러그인 dsTokens가 호출한다.",
    " */",
    "",
    ":root {",
    ...vars,
    "}",
    "",
    ...utilities,
    "",
  ].join("\n");
}
