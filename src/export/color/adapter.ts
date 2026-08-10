// src/export/color/adapter.ts
//
// 엔진 산출물 → ColorSystem. 구조적 타입으로만 받으므로 src/lab/을 import하지 않는다.
// 이 변환이 산출 경로의 유일한 드리프트 가능 지점이라 엔진 쪽이 아니라 여기 두고
// 테스트로 덮는다 (스펙 D2a).

import type { ColorSystem, ExportRole, ExportScale } from "./types.js";
import { assertColorSystem } from "./types.js";

/** src/lab/palette/roles.ts의 ScaleSet과 구조적으로 같은 모양. */
export interface ScaleSetLike {
  readonly accent: readonly string[];
  readonly neutral: readonly string[];
  readonly semantic: Readonly<Record<string, readonly string[]>>;
}

/** src/lab/palette/roles.ts의 ScaleDescriptor와 구조적으로 같은 모양. */
export interface ScaleDescriptorLike {
  readonly name: string;
  readonly label: string;
}

/** 순서와 표시 이름은 `order`가 정한다 — Record의 키 순서에 기대지 않는다. */
export function toColorSystem(
  scales: ScaleSetLike,
  order: readonly ScaleDescriptorLike[],
  roles: readonly ExportRole[],
  stopKeys: readonly string[],
): ColorSystem {
  const exportScales: ExportScale[] = order.map((d) => {
    const hexes =
      d.name === "accent"
        ? scales.accent
        : d.name === "neutral"
          ? scales.neutral
          : scales.semantic[d.name];
    if (!hexes) {
      throw new Error(`toColorSystem: no hexes for scale "${d.name}"`);
    }
    return { name: d.name, label: d.label, hexes };
  });

  const system: ColorSystem = { stopKeys, scales: exportScales, roles };
  assertColorSystem(system);
  return system;
}
