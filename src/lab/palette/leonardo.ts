// src/lab/palette/leonardo.ts
//
// Adobe Leonardo: 흰 배경 대비 콘트라스트 비율 사다리로 스케일 생성.
// 비율 사다리는 1.06→19 기하 급수 — WCAG 비율은 지각적으로 기하 분포이므로.
// 특성: L 배치가 콘트라스트 타깃에서 역산됨 (고정 사다리 계열과 대비되는 접근).
//
// API 확인 (task-7, node_modules/@adobe/leonardo-contrast-colors@1.1.0 README/index.d.ts):
// 브리프의 가정과 실제 타입 정의가 일치했다 — 별도 조정 불필요.
// - `Theme.contrastColors`는 `[background, ...colors]` 형태이며, colors는 생성자에
//   전달한 `colors` 배열 순서를 그대로 따른다. 여기선 accent 하나만 넘기므로
//   `contrastColors[1]`이 항상 accent다.
// - accent의 `values`는 `ratios` 배열에 넘긴 순서 그대로 나온다(재정렬 없음).
//   흰 배경 대비 콘트라스트 비율이 낮을수록(1에 가까울수록) 흰색에 가깝고,
//   높을수록(19에 가까울수록) 어두워지므로 ratioLadder를 오름차순으로 넘기면
//   결과도 자연히 밝은→어두운 순이 된다 (derive 계약과 일치, 별도 정렬 불필요).
import { BackgroundColor, Color, Theme, type CssColor } from "@adobe/leonardo-contrast-colors";
import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const toOklch = converter("oklch");

const RATIO_MIN = 1.06;
const RATIO_MAX = 19;

function ratioLadder(count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    Number((RATIO_MIN * Math.pow(RATIO_MAX / RATIO_MIN, i / (count - 1))).toFixed(2)),
  );
}

export const leonardoAlgorithm: AccentAlgorithm = {
  id: "leonardo",
  label: "Adobe Leonardo (contrast ladder)",
  description:
    "흰 배경과의 콘트라스트 비율(글자가 얼마나 잘 읽히는지의 기준)을 단계별로 먼저 정해두고, 그 비율이 나오도록 밝기를 역산한다. 접근성을 1순위에 둔 설계 — 입력색의 콘트라스트가 우연히 사다리에 걸리지 않는 한 입력색 자체는 스케일에 남지 않는다.",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const accent = new Color({
      name: "accent",
      // anchorHex는 인터페이스상 plain string — Leonardo의 CssColor 템플릿 리터럴
      // 유니온과 구조적으로 안 맞아 캐스트가 필요하다. 값은 hex 문자열 그대로.
      colorKeys: [anchorHex as CssColor],
      ratios: ratioLadder(spec.count),
    });
    const background = new BackgroundColor({
      name: "background",
      colorKeys: ["#ffffff"],
      ratios: [],
    });
    const theme = new Theme({ colors: [accent], backgroundColor: background, lightness: 100 });
    // contrastColors[0]은 background, [1]이 accent — values는 ratio 오름차순(밝은→어두운)
    const accentColor = theme.contrastColors[1];
    if (!("values" in accentColor)) {
      throw new Error("leonardoAlgorithm: expected accent ContrastColor with values");
    }
    return accentColor.values.map(({ value }) => {
      const o = toOklch(value)!;
      return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
    });
  },
};
