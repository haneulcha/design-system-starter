import { describe, it, expect } from "vitest";
import { generateElevationCategory } from "@core/generator/elevation-category.js";
import { renderTokensCss } from "./tokensCss";

describe("renderTokensCss", () => {
  const css = renderTokensCss();

  it("spacing alias를 px 변수로 낸다", () => {
    expect(css).toContain("--ds-space-md: 16px;");
    expect(css).toContain("--ds-space-lg: 24px;");
    expect(css).toContain("--ds-space-section: 96px;");
  });

  it("radius 이름 토큰을 낸다 — 숫자는 px, 특수값은 그대로", () => {
    expect(css).toContain("--ds-radius-card: 12px;");
    expect(css).toContain("--ds-radius-button: 8px;");
    expect(css).toContain("--ds-radius-none: 0px;");
    expect(css).toContain("--ds-radius-pill: 9999px;");
    expect(css).toContain("--ds-radius-circle: 50%;");
  });

  // 그림자 문자열을 여기 하드코딩하면 스키마가 바뀔 때 이 테스트가 같이 낡는다.
  // 엔진에게 물어서 비교해야 "화면이 스키마를 따라간다"는 성공 기준 2가 지켜진다.
  it("elevation은 shadow×subtle 프로필과 문자열이 같다", () => {
    const raised = generateElevationCategory({ style: "shadow", intensity: "subtle" })
      .levels.find((l) => l.name === "raised");
    expect(raised).toBeTruthy();
    expect(css).toContain(`--ds-shadow-raised: ${raised!.shadow};`);
    expect(css).toContain("--ds-shadow-none: none;");
  });

  // @utility 대신 평범한 클래스 셀렉터 — @tailwindcss/vite가 엔트리 CSS의
  // @import 대상 안에서는 @utility를 처리하지 않는다고 실측으로 확인됐다
  // (vite.config.ts의 ds-tokens 플러그인 배선, 2026-08-24).
  it("타이포 프로필을 클래스 셀렉터로 낸다", () => {
    expect(css).toContain(".ds-type-heading-sm {");
    expect(css).toContain(".ds-type-heading-xxs {");
    expect(css).toContain(".ds-type-caption-sm {");
    expect(css).toContain(".ds-type-code-sm {");
    // 단일 variant 카테고리는 점 없는 이름 그대로
    expect(css).toContain(".ds-type-badge {");
  });

  it("heading.xxs 유틸리티가 스키마 값(16/600/1.4)을 담는다", () => {
    const block = css.slice(css.indexOf(".ds-type-heading-xxs {"));
    const body = block.slice(0, block.indexOf("}"));
    expect(body).toContain("font-size: 16px;");
    expect(body).toContain("font-weight: 600;");
    expect(body).toContain("line-height: 1.4;");
    expect(body).toContain("font-family: var(--ds-font-sans);");
  });

  it("폰트 체인 두 개를 변수로 낸다", () => {
    expect(css).toContain("--ds-font-sans:");
    expect(css).toContain("--ds-font-mono:");
    expect(css).toContain("Pretendard");
  });

  // Global Constraint의 기계적 방어선. 이게 초록인 한 다른 화면은 안전하다.
  it("Tailwind 기본 네임스페이스를 정의하지 않는다", () => {
    const offenders = css
      .split("\n")
      .filter((l) => /^\s*--(text|radius|spacing|shadow|color|font)-/.test(l));
    expect(offenders).toEqual([]);
  });

  // 원 스케일은 안 내보낸다 (스펙 D2) — 크롬이 스케일에서 임의로 집는 뒷문을 막는다.
  it("원 스케일을 내보내지 않는다", () => {
    expect(css).not.toContain("--ds-space-scale");
    expect(css).not.toContain("--ds-radius-scale");
  });
});
