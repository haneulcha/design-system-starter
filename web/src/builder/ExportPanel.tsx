// web/src/builder/ExportPanel.tsx
//
// 산출물 다운로드 + 격리된 미리보기.
// 미리보기가 @theme이 아니라 palette.css를 쓰는 이유: @theme은 빌드 타임
// 지시문이라 런타임에 <style>로 주입해도 유틸리티가 생성되지 않는다.
// 대신 스코프된 변수를 직접 참조한다 — 덕분에 전역 오염도 구조적으로 불가능하다.

import { useMemo, useState } from "react";
import {
  generateColorCss,
  generateColorThemeCss,
  renderColorDesignMd,
  toColorFigma,
  toColorSystem,
} from "@core/export/color/index.js";
import { SCALE_ORDER, SCALE_ROLES, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const buttonClass =
  "px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-medium " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

const PREVIEW_SELECTORS = {
  light: ".palette-preview",
  dark: ".palette-preview.dark",
};

export function ExportPanel({ scales }: { scales: ScaleSet }) {
  const [dark, setDark] = useState(false);

  const system = useMemo(
    () => toColorSystem(scales, SCALE_ORDER, SCALE_ROLES, STOP_KEYS),
    [scales],
  );
  const files = useMemo(
    () => ({
      css: generateColorCss(system),
      themeCss: generateColorThemeCss(system),
      figma: JSON.stringify(toColorFigma(system), null, 2),
      designMd: renderColorDesignMd(system),
    }),
    [system],
  );
  const previewCss = useMemo(
    () => generateColorCss(system, PREVIEW_SELECTORS),
    [system],
  );

  return (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      <h2 className="text-sm font-medium">받아 가기 — 색만</h2>
      <p className="text-[11px] leading-4 text-neutral-400">
        타이포·간격·라운드는 여기 없습니다. 이 네 파일은 색 시스템만 담습니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.css", files.css, "text/css")}
        >
          palette.css
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.theme.css", files.themeCss, "text/css")}
        >
          palette.theme.css
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.figma.json", files.figma, "application/json")}
        >
          palette.figma.json
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("DESIGN.md", files.designMd, "text/markdown")}
        >
          DESIGN.md
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-700"
          onClick={() => navigator.clipboard.writeText(files.css)}
        >
          copy CSS
        </button>
      </div>

      <p className="text-[11px] leading-4 text-neutral-400">
        <span className="font-medium text-neutral-500">palette.css</span>는 어디서나
        쓰는 변수,{" "}
        <span className="font-medium text-neutral-500">palette.theme.css</span>는
        Tailwind v4에서 <code>bg-accent-solid</code> 같은 유틸리티까지 만들어 줍니다.
      </p>

      <div className="space-y-2 border-t border-neutral-100 pt-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[11px] font-medium text-neutral-600">
            받아 간 변수로 그린 미리보기
          </h3>
          <button
            type="button"
            className="text-[10px] text-neutral-400 hover:text-neutral-700"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "라이트로" : "다크로"}
          </button>
        </div>
        <style>{previewCss}</style>
        <div
          className={`palette-preview rounded-lg p-4 space-y-3${dark ? " dark" : ""}`}
          style={{ background: "var(--color-neutral-subtle-bg)" }}
        >
          <div
            className="rounded-md p-3 space-y-2"
            style={{
              background: "var(--color-accent-subtle-bg)",
              border: "1px solid var(--color-accent-border)",
            }}
          >
            <div
              className="text-[11px] font-medium"
              style={{ color: "var(--color-accent-text-strong)" }}
            >
              알림 카드 제목
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-accent-text)" }}>
              링크 텍스트가 이 색으로 보입니다
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                background: "var(--color-accent-solid)",
                color: "var(--color-accent-on-solid)",
              }}
            >
              솔리드 버튼
            </span>
            <span
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                background: "var(--color-error-subtle-bg)",
                color: "var(--color-error-text-strong)",
              }}
            >
              오류 배지
            </span>
          </div>
        </div>
        <p className="text-[11px] leading-4 text-neutral-400">
          이 블록 안에서만 변수가 유효합니다 — 나머지 화면은 안 바뀝니다. 토글해 보면
          색이 새로 만들어지는 게 아니라 역할이 가리키는 자리만 옮겨가는 걸 볼 수 있습니다.
        </p>
      </div>
    </div>
  );
}
