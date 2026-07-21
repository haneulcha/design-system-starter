// src/lab/accent-scale/hct.ts
//
// Material HCT: 앵커의 HCT hue/chroma를 고정하고 tone(≈L*)만 사다리로 배치.
// tone 사다리는 98→8 균등 분할 — Material 표준 톤셋 대신 임의 count 대응.
// 특성: 입력 색의 밝기(tone)를 앵커 위치에 존중하지 않음 (v1과 같은 고정 사다리 계열).
//
// 배포 API 이슈 (2026-07-21 발견, task-6):
// `@material/material-color-utilities@0.4.0`(= latest, 더 새 버전 없음)의
// index.js는 `export * from './scheme/...'` 등으로 전체 서브모듈을 재수출하는데,
// 그 중 dynamiccolor/color_spec_2025.js가 `from './dynamic_color'`처럼 확장자
// 없이 임포트한다. package.json의 `type: "module"` + strict ESM 리졸버(Node/Vite
// 둘 다) 하에서는 확장자 없는 상대 임포트가 실패하여, 패키지 루트("@material/
// material-color-utilities")를 import하는 순간 무조건 깨진다.
// 서브패스 직접 import(`@material/material-color-utilities/hct/hct.js`)로 우회를
// 시도했으나, 이 패키지의 exports map에는 "." 하나만 정의되어 있어
// ERR_PACKAGE_PATH_NOT_EXPORTED로 막힌다.
// → 여기서는 "." 서브패스 해석만으로 패키지 루트 디렉터리를 알아낸 뒤(이건 exports
//   map이 허용), 필요한 서브모듈 파일만 절대 경로로 직접 동적 import한다. 이렇게 하면
//   깨진 scheme/dynamiccolor 트리를 전혀 로드하지 않는다. 동적 import라 최상위
//   await가 필요하지만, derive()가 호출되는 시점(테스트/벤치)에는 이미 module
//   초기화가 끝난 뒤이므로 동기 시그니처(AccentAlgorithm.derive)는 그대로 유지된다.
import { createRequire } from "node:module";
import path from "node:path";
import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const require = createRequire(import.meta.url);
const pkgRoot = path.dirname(require.resolve("@material/material-color-utilities"));

const { Hct } = await import(path.join(pkgRoot, "hct/hct.js"));
const { TonalPalette } = await import(path.join(pkgRoot, "palettes/tonal_palette.js"));
const { argbFromHex, hexFromArgb } = await import(path.join(pkgRoot, "utils/string_utils.js"));

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
