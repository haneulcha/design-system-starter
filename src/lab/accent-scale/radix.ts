// src/lab/accent-scale/radix.ts
//
// Radix custom-color 알고리즘 포팅 (accent 스케일 경로만).
//
// 원본: radix-ui/website `components/generate-radix-colors.tsx`
//   commit 88a9f14dbe36e7285d32df01e139b0ab2e1de574
//   https://raw.githubusercontent.com/radix-ui/website/88a9f14dbe36e7285d32df01e139b0ab2e1de574/components/generate-radix-colors.tsx
//   MIT License, Copyright (c) 2024 WorkOS.
//
// 실험 코드 — 제품 파이프라인에서 import 금지 (레지스트리/벤치만 사용).
//
// ── 의존성 선택 ──────────────────────────────────────────────────────────────
// 원본은 colorjs.io + bezier-easing으로 작성됨. 이 둘을 devDep으로 추가하고
// **near-verbatim 포팅**한다 (culori 재작성 대비 포팅 오차 최소화가 목적).
// 둘 다 plain static ESM이라 브라우저 번들 안전 요건(Task 6)을 만족한다.
// (색 수학을 culori로 옮기면 스냅/이징/gamut-map 미묘한 차이로 round-trip
//  게이트를 흔들 위험이 커서 채택하지 않음. 리서치 랩에서 번들 크기는 무관.)
//
// ── 포팅 범위 (accent 스케일, light mode, white 배경) ─────────────────────────
// 포팅한 것:
//   - 24개 Radix P3 레퍼런스 스케일 스냅 (getScaleFromColor)
//   - 두 최근접 스케일의 삼각비 기반 비례 믹스 + gray dedup
//   - source 색으로 chroma/hue 보정, step-9 앵커 보정 (getStep9Colors)
//   - step-10 버튼 hover 색 (getButtonHoverColor)
//   - step-11/12 채도 제한
//   - light-mode 밝기 전치 (transposeProgressionStart, lightModeEasing)
// 생략한 것 (accent 스케일 경로에 불필요):
//   - dark mode (appearance/darkColors/darkModeEasing, getScaleFromColor 다크 분기)
//   - gray 스케일 출력 및 pure white/black accent → gray 대체 (앵커는 항상 유채색)
//   - P3/wide-gamut 출력, alpha 색, surface 색, contrast(text) 색
//   - sRGB hex 문자열화 (여기선 OKLCH coords를 그대로 Oklch로 반환)
// 배경색은 light mode의 white(#ffffff)로 고정 (diff=0 → 밝기 전치는 항등).

import Color from "colorjs.io";
import BezierEasing from "bezier-easing";
import * as RadixColors from "@radix-ui/colors";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

type ArrayOf12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];
const arrayOf12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

// colorjs.io는 coords를 (number|null)[]로 타입하지만 런타임 값은 항상 number다
// (무채색 hue는 NaN이지만 여전히 number). 읽기 지점에서 좁혀 쓴다.
const cd = (color: Color): [number, number, number] =>
  color.coords as [number, number, number];

// prettier-ignore
const grayScaleNames = ["gray", "mauve", "slate", "sage", "olive", "sand"] as const;

// prettier-ignore
const scaleNames = [...grayScaleNames, "tomato", "red", "ruby", "crimson", "pink",
  "plum", "purple", "violet", "iris", "indigo", "blue", "cyan", "teal", "jade", "green",
  "grass", "brown", "orange", "sky", "mint", "lime", "yellow", "amber"] as const;

const radixScales = RadixColors as unknown as Record<string, Record<string, string>>;

// 원본과 동일: 각 스케일의 P3 변형을 OKLCH로 변환한 12색 참조 세트 (light).
const lightColors = Object.fromEntries(
  scaleNames.map((scaleName) => [
    scaleName,
    Object.values(radixScales[`${scaleName}P3`]).map((str) =>
      new Color(str).to("oklch"),
    ),
  ]),
) as Record<(typeof scaleNames)[number], ArrayOf12<Color>>;

const lightModeEasing = [0, 2, 0, 2] as [number, number, number, number];

function transposeProgressionStart(
  to: number,
  arr: number[],
  curve: [number, number, number, number],
): number[] {
  return arr.map((n, i, a) => {
    const lastIndex = a.length - 1;
    const diff = a[0] - to;
    const fn = BezierEasing(...curve);
    return n - diff * fn(1 - i / lastIndex);
  });
}

function getStep9Color(scale: ArrayOf12<Color>, accentBaseColor: Color): Color {
  const referenceBackgroundColor = scale[0];
  const distance = accentBaseColor.deltaEOK(referenceBackgroundColor) * 100;

  // accent base가 페이지 배경색에 매우 가까우면(흰-위-흰 / 검-위-검) 스케일의
  // step-9를 쓴다. 그 외에는 입력색 자체를 step-9 앵커로 사용.
  if (distance < 25) {
    return scale[8];
  }
  return accentBaseColor;
}

function getButtonHoverColor(source: Color, scales: ArrayOf12<Color>[]): Color {
  const [L, C, H] = cd(source);
  const newL = L > 0.4 ? L - 0.03 / (L + 0.1) : L + 0.03 / (L + 0.1);
  const newC = L > 0.4 && !isNaN(H) ? C * 0.93 + 0 : C;
  const buttonHoverColor = new Color("oklch", [newL, newC, H]);

  // 스케일 안에서 가장 가까운 색을 찾아 chroma/hue를 이식한다.
  let closestColor = buttonHoverColor;
  let minDistance = Infinity;

  scales.forEach((scale) => {
    for (const color of scale) {
      const distance = buttonHoverColor.deltaEOK(color);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }
  });

  buttonHoverColor.coords[1] = cd(closestColor)[1];
  buttonHoverColor.coords[2] = cd(closestColor)[2];
  return buttonHoverColor;
}

function getScaleFromColor(
  source: Color,
  scales: Record<string, ArrayOf12<Color>>,
  backgroundColor: Color,
): ArrayOf12<Color> {
  const allColors: { scale: string; color: Color; distance: number }[] = [];

  Object.entries(scales).forEach(([name, scale]) => {
    for (const color of scale) {
      const distance = source.deltaEOK(color);
      allColors.push({ scale: name, distance, color });
    }
  });

  allColors.sort((a, b) => a.distance - b.distance);

  // 스케일별 최근접 색만 남긴다 (중복 스케일 제거)
  const closestColors = allColors.filter(
    (color, i, arr) => i === arr.findIndex((value) => value.scale === color.scale),
  );

  // 최근접 두 색이 모두 gray면, 두 번째가 gray가 아닐 때까지 제거한다.
  // (다음 단계에서 두 색의 근접도를 비교하는데, gray끼리는 서로 극히 가까워
  //  두 번째 gray에서 유용한 정보를 못 얻기 때문)
  const grayScaleNamesStr = grayScaleNames as readonly string[];
  const allAreGrays = closestColors.every((color) =>
    grayScaleNamesStr.includes(color.scale),
  );
  if (!allAreGrays && grayScaleNamesStr.includes(closestColors[0].scale)) {
    while (grayScaleNamesStr.includes(closestColors[1].scale)) {
      closestColors.splice(1, 1);
    }
  }

  const colorA = closestColors[0];
  const colorB = closestColors[1];

  // 삼각비: source(C)와 두 최근접 색 A,B가 이루는 삼각형에서, A/B 각이 모두
  // 예각이면 AD:BD 비율로 A와 B를 섞으면 source에 더 가까운 색이 나온다.
  // 둔각이면 B는 A와 방향이 같아 섞어도 이득이 없으므로 A만 쓴다.
  const a = colorB.distance;
  const b = colorA.distance;
  const c = colorA.color.deltaEOK(colorB.color);

  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c);
  const radA = Math.acos(cosA);
  const sinA = Math.sin(radA);

  const cosB = (a ** 2 + c ** 2 - b ** 2) / (2 * a * c);
  const radB = Math.acos(cosB);
  const sinB = Math.sin(radB);

  // ACD 삼각형의 각 C의 tangent
  const tanC1 = cosA / sinA;
  // BCD 삼각형의 각 C의 tangent
  const tanC2 = cosB / sinB;

  // tangent 비율 = AD:BD 거리 비율 = A에 섞을 B의 비율.
  // 0 이하이면 case 2의 둔각 삼각형 → A만 사용.
  const ratio = Math.max(0, tanC1 / tanC2) * 0.5;

  const scaleA = scales[colorA.scale];
  const scaleB = scales[colorB.scale];
  const scale = arrayOf12.map((i) =>
    new Color(Color.mix(scaleA[i], scaleB[i], ratio)).to("oklch"),
  ) as ArrayOf12<Color>;

  // 믹스한 스케일에서 source에 가장 가까운 색
  const baseColor = scale
    .slice()
    .sort((x, y) => source.deltaEOK(x) - source.deltaEOK(y))[0];

  // source와 base의 chroma 차이 기록
  const ratioC = cd(source)[1] / cd(baseColor)[1];

  // 스케일의 hue/chroma를 source에 맞춘다
  scale.forEach((color) => {
    color.coords[1] = Math.min(cd(source)[1] * 1.5, cd(color)[1] * ratioC);
    color.coords[2] = cd(source)[2];
  });

  // Light mode (배경 white → step-1 L > 0.5이므로 항상 이 분기)
  const lightnessScale = scale.map((color) => cd(color)[0]);
  const backgroundL = Math.max(0, Math.min(1, cd(backgroundColor)[0]));
  const newLightnessScale = transposeProgressionStart(
    backgroundL,
    // light 스케일 첫 "step"으로 white(1)를 추가
    [1, ...lightnessScale],
    lightModeEasing,
  );

  // 추가했던 step 제거
  newLightnessScale.shift();

  newLightnessScale.forEach((lightness, i) => {
    scale[i].coords[0] = lightness;
  });

  return scale;
}

const WHITE_BACKGROUND = new Color("#ffffff").to("oklch");

/** 포팅 본체: accent hex → light-mode 12색 OKLCH 스케일 (밝은→어두운). */
function deriveRadix12(anchorHex: string): Oklch[] {
  const accentBaseColor = new Color(anchorHex).to("oklch");

  const accentScaleColors = getScaleFromColor(
    accentBaseColor,
    lightColors,
    WHITE_BACKGROUND,
  );

  const accent9Color = getStep9Color(accentScaleColors, accentBaseColor);
  accentScaleColors[8] = accent9Color;
  accentScaleColors[9] = getButtonHoverColor(accent9Color, [accentScaleColors]);

  // text 색(step 11/12)의 채도 제한
  accentScaleColors[10].coords[1] = Math.min(
    Math.max(cd(accentScaleColors[8])[1], cd(accentScaleColors[7])[1]),
    cd(accentScaleColors[10])[1],
  );
  accentScaleColors[11].coords[1] = Math.min(
    Math.max(cd(accentScaleColors[8])[1], cd(accentScaleColors[7])[1]),
    cd(accentScaleColors[11])[1],
  );

  return accentScaleColors.map((color) => {
    const [l, cChroma, h] = cd(color);
    return { l, c: cChroma, h: isNaN(h) ? 0 : h };
  });
}

// count !== 12 인 spec 요청 시: 12-step 결과를 위치 비례로 선형 재표집.
// 주의(comparability): 이 선형 위치 재표집은 앵커를 항상 12-step 결과의 인덱스 8
// (스텝 9)에 고정한 뒤 스케일링하므로, 호출자가 요청한 spec.anchorIndex는 count가
// 12가 아닌 한 무시된다 — 예: count=11 요청이면 앵커는 실제로 인덱스 ≈7.3 근방에
// 놓인다(요청한 5가 아님). derive()의 anchorIndex 파라미터는 count=12일 때만
// 유효하다. 벤치마크에서 tailwind(11-step) 대비 ΔE에는 이 앵커 불일치가 섞여있다.
function resample(scale12: Oklch[], count: number): Oklch[] {
  if (count === 12) return scale12;
  return Array.from({ length: count }, (_, i) => {
    const x = (i / (count - 1)) * 11;
    const j = Math.min(Math.floor(x), 10);
    const t = x - j;
    const a = scale12[j];
    const b = scale12[j + 1];
    return {
      l: a.l + (b.l - a.l) * t,
      c: a.c + (b.c - a.c) * t,
      h: a.h + (b.h - a.h) * t,
    };
  });
}

export const radixAlgorithm: AccentAlgorithm = {
  id: "radix",
  label: "Radix custom color (ported)",
  nativeSpec: { count: 12, anchorIndex: 8 },
  // 주의(comparability): spec.anchorIndex는 읽지 않는다 — 항상 네이티브 12-step
  // (앵커=인덱스 8)을 유도한 뒤 resample()로 재표집하므로, count≠12인 레퍼런스와
  // 비교할 때 요청한 앵커 위치가 실제로 존중되지 않는다 (resample() 주석 참고).
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const scale12 = deriveRadix12(anchorHex);
    return resample(scale12, spec.count);
  },
};
