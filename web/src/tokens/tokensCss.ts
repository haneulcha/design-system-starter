// web/src/tokens/tokensCss.ts
//
// 도구 화면의 크롬이 먹을 CSS를 스키마 v1에서 생성한다. 이 파일은 앱이 import하지
// 않는다 — vite 플러그인(vite.config.ts)만 부르고, 결과는 tokens.generated.css로
// 나간다.
//
// 네임스페이스는 --ds-* 고정이다. Tailwind @theme의 기본 네임스페이스(--text-*
// 등)를 덮으면 global.css를 공유하는 inspector·#lab·#builder가 같이 바뀌어
// "이 화면만"이라는 범위가 거짓이 된다 (스펙 D2).

// vite.config.ts가 이 파일을 정적 import한다. vite 자신의 config 로딩(esbuild
// 번들링) 단계는 아직 존재하지 않는 이 config의 resolve.alias를 못 쓰므로,
// "@core/*" 별칭이 아니라 상대경로로 src/generator에 닿는다 — 별칭 의존은
// 이 4줄이 전부라 상대경로로도 무리 없다.
import { generateSpacingCategory } from "../../../src/generator/spacing-category.js";
import { generateRadiusCategory } from "../../../src/generator/radius-category.js";
import { generateElevationCategory } from "../../../src/generator/elevation-category.js";
import { generateTypographyCategory } from "../../../src/generator/typography-category.js";

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

  // ring 레벨은 emit에서 뺀다. buildLevelShadow는 style 검사보다 앞에서 무조건
  // ringColor를 쓰는데(elevation-category.ts의 buildLevelShadow, "ring" 분기),
  // 여기는 generateElevationCategory에 ringColor 인자를 안 넘겨서 스키마의
  // DEFAULT_RING_COLOR(계보 없는 테스트용 fallback 회색, schema/elevation.ts)가
  // 그대로 나간다. 이 화면은 링 색을 공급할 뉴트럴 팔레트를(도구 크롬 기준으로)
  // 갖고 있지 않다 — 색을 공급할 수 없는 레벨은 내보내지 않는다. 소비자도 없다.
  vars.push("", "  /* elevation — shadow × subtle, ring 제외 4레벨. */");
  for (const level of elevation.levels) {
    if (level.name === "ring") continue;
    vars.push(`  --ds-shadow-${level.name}: ${level.shadow};`);
  }

  vars.push("", "  /* font chains */");
  vars.push(`  --ds-font-sans: ${type.fontChains.sans};`);
  vars.push(`  --ds-font-mono: ${type.fontChains.mono};`);

  const utilities = Object.entries(type.profiles).map(([key, p]) => {
    const family = p.fontFamily === type.fontChains.mono ? "mono" : "sans";
    return [
      `@utility ds-type-${utilityName(key)} {`,
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
