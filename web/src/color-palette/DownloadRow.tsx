// web/src/color-palette/DownloadRow.tsx
import { useMemo } from "react";
import {
  generateColorCss, generateColorThemeCss, renderColorDesignMd, toColorFigma, toColorSystem,
} from "@core/export/color/index.js";
import { buildContrastWarnings } from "@core/color/contrast.js";
import { SCALE_ORDER, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";
import { canCopy, copyText, downloadFile } from "../lib/download";

const btn =
  "px-3 py-1.5 rounded-md border border-neutral-200 bg-white ds-type-body-sm " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

export function DownloadRow({
  scales, roles,
}: { readonly scales: ScaleSet; readonly roles: readonly ScaleRole[] }) {
  const files = useMemo(() => {
    const system = toColorSystem(scales, SCALE_ORDER, roles, STOP_KEYS);
    // 경고 문구는 엔진 계산으로 만들어 산출 코드에 데이터로 넘긴다 — 산출 코드가 대비를
    // 직접 재면 화면 뱃지와 갈라질 수 있다 (스펙 D5). 화면 뱃지(PreviewPane)와 같은
    // 전체 실패 집합을 쓴다 — buildContrastWarnings가 부분집합화 없이 이를 보장한다.
    const warnings = buildContrastWarnings(scales, roles);
    return {
      css: generateColorCss(system),
      themeCss: generateColorThemeCss(system),
      figma: JSON.stringify(toColorFigma(system), null, 2),
      designMd: renderColorDesignMd(system, warnings),
    };
  }, [scales, roles]);

  const items: [string, string, string][] = [
    ["palette.css", files.css, "text/css"],
    ["palette.theme.css", files.themeCss, "text/css"],
    ["palette.figma.json", files.figma, "application/json"],
    ["DESIGN.md", files.designMd, "text/markdown"],
  ];

  return (
    <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
      {items.map(([name, content, mime]) => (
        <button key={name} type="button" className={btn}
          onClick={() => downloadFile(name, content, mime)}>
          {name}
        </button>
      ))}
      <button type="button" disabled={!canCopy()}
        className="px-3 py-1.5 ds-type-caption-sm text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
        onClick={() => void copyText(files.css)}>
        copy CSS
      </button>
    </div>
  );
}
