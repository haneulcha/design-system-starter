// src/lab/accent-scale/hct.ts
//
// Material HCT: 앵커의 HCT hue/chroma를 고정하고 tone(≈L*)만 사다리로 배치.
// tone 사다리는 98→8 균등 분할 — Material 표준 톤셋 대신 임의 count 대응.
// 특성: 입력 색의 밝기(tone)를 앵커 위치에 존중하지 않음 (v1과 같은 고정 사다리 계열).
//
// 벤더 패키징 버그 (2026-07-21 발견, task-6):
// `@material/material-color-utilities@0.4.0`(= latest)의 index.js는
// `export * from './scheme/...'` 등으로 전체 서브모듈을 재수출하는데, 그 중
// dynamiccolor/color_spec_2025.js가 `from './dynamic_color'`처럼 확장자 없이
// 상대 임포트한다. `"type": "module"` 하의 strict ESM 리졸버(Node/Vite 둘 다)는
// 확장자 없는 상대 스펙파이어를 거부하므로, 패키지 루트("@material/
// material-color-utilities")를 import하는 순간 그 값을 실제로 쓰든 안 쓰든
// 무조건 깨진다 — 우리가 필요한 건 Hct/TonalPalette/string_utils뿐이라
// dynamiccolor 트리는 아예 로드할 필요가 없다.
// 이 패키지의 package.json exports map에는 "." 하나만 정의돼 있어 서브패스 직접
// import(`.../hct/hct.js`)도 기본적으로 ERR_PACKAGE_PATH_NOT_EXPORTED로 막힌다.
// → 루트에 커밋한 pnpm patch(patches/@material__material-color-utilities.patch)가
//   exports map에 와일드카드 `"./*": "./*"`를 추가해 서브패스 접근을 허용한다.
//   이 파일은 그 패치를 전제로, 깨진 dynamiccolor 그래프를 건드리지 않는 정적
//   서브패스 import만 사용한다. Node 전용 API(`node:module`/`node:path`,
//   동적 import + top-level await)는 쓰지 않는다 — 이 어댑터는 Task 9에서
//   웹 랩(Vite/브라우저 번들)에도 로드되므로, node: 빌트인이나 파일시스템
//   절대경로는 여기서 금지.
import { Hct } from "@material/material-color-utilities/hct/hct.js";
import { TonalPalette } from "@material/material-color-utilities/palettes/tonal_palette.js";
import { argbFromHex, hexFromArgb } from "@material/material-color-utilities/utils/string_utils.js";
import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const toOklch = converter("oklch");

const TONE_TOP = 98;
const TONE_BOTTOM = 8;

export const hctAlgorithm: AccentAlgorithm = {
  id: "hct",
  label: "Material HCT (tonal palette)",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const hct = Hct.fromInt(argbFromHex(anchorHex));
    const palette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
    return Array.from({ length: spec.count }, (_, i) => {
      const tone = TONE_TOP - ((TONE_TOP - TONE_BOTTOM) * i) / (spec.count - 1);
      const hex = hexFromArgb(palette.tone(Math.round(tone)));
      const o = toOklch(hex)!;
      return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
    });
  },
};
