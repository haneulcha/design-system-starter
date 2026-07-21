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
//
// 패치 도달 경로 (Task 9에서 검증, 2026-07-21):
// 이 파일(`src/lab/accent-scale/hct.ts`)의 서브패스 import는 Node/Vite의
// 디렉터리 walk-up 리졸루션으로 이 파일 기준 조상 경로를 타고 올라가
// **repo 루트의 node_modules**(pnpm patch 적용됨, patches/ + pnpm-workspace.yaml)에서
// 해석된다. `web/node_modules`에도 같은 패키지가 존재하지만(`web/package.json`에
// devDependency로 명시 — 의존성 위생 목적) 그건 plain npm install이 받은
// **패치 안 된** 사본이고, walk-up 경로상 이 파일에서는 구조적으로 도달 불가능하다
// (web/이 이 파일의 조상 디렉터리가 아니므로).
// ⚠️ 만약 이 파일(또는 lab 모듈 전체)이 나중에 web/ 아래로 옮겨지거나, repo가
// pnpm workspace로 전환되어 node_modules 리졸루션 위치가 바뀌면 — 서브패스
// import가 패치 안 된 사본에 걸려 깨질 수 있다. 그럴 때는 반드시 어느 사본이
// 실제로 리졸브되는지, 그 사본에 패치가 적용돼 있는지 다시 검증할 것.
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
