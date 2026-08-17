// src/export/color/figma.ts
//
// Figma 변수 컬렉션 2개. 레거시(src/figma/transformer.ts)와 다른 점:
// Color Primitives가 단일 모드다. 우리는 프리미티브가 테마 간에 안 변하고
// 역할이 가리키는 자리만 바뀌므로, 프리미티브에 Light/Dark를 둘 이유가 없다.
//
// 값은 해석된 hex다. FigmaVariable.valuesByMode가 string | number라 별칭을
// 표현할 타입이 없다 — 역할↔프리미티브 관계는 이 산출물에서 사라진다 (알려진 한계).

import type {
  FigmaDesignSystem,
  FigmaVariable,
  FigmaVariableCollection,
} from "../../figma/types.js";
import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";
import { defaultResolver, stopRole } from "./vars.js";

const DEFAULT_MODE = "mode-default";
const LIGHT_MODE = "mode-light";
const DARK_MODE = "mode-dark";

export function toColorFigma(system: ColorSystem): FigmaDesignSystem {
  assertColorSystem(system);

  const primitives: FigmaVariable[] = [];
  for (const scale of system.scales) {
    system.stopKeys.forEach((key, i) => {
      primitives.push({
        name: `${scale.name}-${key}`,
        type: "COLOR",
        valuesByMode: { [DEFAULT_MODE]: scale.hexes[i] },
      });
    });
  }

  const roles: FigmaVariable[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      const [light, dark] =
        role.kind === "contrast"
          ? (() => {
              const t = stopRole(system, role.against);
              const v = defaultResolver(scale.hexes[t.lightIndex]);
              return [v, v];
            })()
          : [scale.hexes[role.lightIndex], scale.hexes[role.darkIndex]];
      roles.push({
        name: `${scale.name}-${role.id}`,
        type: "COLOR",
        valuesByMode: { [LIGHT_MODE]: light, [DARK_MODE]: dark },
      });
    }
  }

  const variableCollections: FigmaVariableCollection[] = [
    {
      name: "Color Primitives",
      modes: [{ name: "Default", modeId: DEFAULT_MODE }],
      variables: primitives,
    },
    {
      name: "Colors",
      modes: [
        { name: "Light", modeId: LIGHT_MODE },
        { name: "Dark", modeId: DARK_MODE },
      ],
      variables: roles,
    },
  ];

  return { variableCollections, textStyles: [], effectStyles: [] };
}
