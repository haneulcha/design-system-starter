// web/src/color-palette/DownloadRow.tsx
import { useMemo } from "react";
import {
  generateColorCss, generateColorThemeCss, renderColorDesignMd, toColorFigma, toColorSystem,
} from "@core/export/color/index.js";
import { SCALE_ORDER, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";
import { checkContrast } from "@core/color/contrast.js";
import { canCopy, copyText, downloadFile } from "../lib/download";

const btn =
  "px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-medium " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

export function DownloadRow({
  scales, roles,
}: { readonly scales: ScaleSet; readonly roles: readonly ScaleRole[] }) {
  const files = useMemo(() => {
    const system = toColorSystem(scales, SCALE_ORDER, roles, STOP_KEYS);
    // 경고 문구는 엔진 계산으로 만들어 산출 코드에 데이터로 넘긴다 — 산출 코드가 대비를
    // 직접 재면 화면 뱃지와 갈라질 수 있다 (스펙 D5).
    // "큰 글씨에만 쓰라"고 쓰지 않는다: 2.96은 큰 글씨 기준 3:1도 미달이다.
    const warnings = checkContrast(scales, roles)
      .filter((c) => !c.passes && c.theme === "light" && c.against === "subtle-bg")
      .map(
        (c) =>
          `\`--color-${c.scaleName}-${c.roleId}\`는 라이트 테마에서 AA에 미달한다 — ` +
          `은은한 배경 위 ${c.ratio.toFixed(2)}이라 본문(${c.required}:1)은 물론 ` +
          `큰 글씨(3:1)로도 부족하다. AA가 필요하면 \`--color-${c.scaleName}-800\`을 직접 쓸 것.`,
      );
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
        className="px-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
        onClick={() => void copyText(files.css)}>
        copy CSS
      </button>
    </div>
  );
}
