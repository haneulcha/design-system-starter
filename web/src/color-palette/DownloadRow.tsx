// web/src/color-palette/DownloadRow.tsx
import { useMemo, useEffect, useRef, useState } from "react";
import {
  generateColorCss, generateColorThemeCss, renderColorDesignMd, toColorFigma, toColorSystem,
} from "@core/export/color/index.js";
import { buildContrastWarnings } from "@core/color/contrast.js";
import { SCALE_ORDER, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";
import { canCopy, copyText, downloadFile } from "../lib/download";

const btn =
  "ds-type-body-sm px-3 py-2 rounded-md border border-neutral-200 bg-white " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

type CopyState = "idle" | "ok" | "fail";

export function DownloadRow({
  scales, roles,
}: { readonly scales: ScaleSet; readonly roles: readonly ScaleRole[] }) {
  const [copied, setCopied] = useState<CopyState>("idle");
  const timerRef = useRef<number | null>(null);

  // 언마운트 시 타이머 정리 — 2초 뒤 setState가 도는데 그 사이 언마운트되면 경고가 난다.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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

  const copyable = canCopy();

  // 결과를 버리지 않는다 — copyText는 권한 거부에서 false를 낸다. 성공만
  // 표시하면 실패가 조용해져 지금(void로 버리는 것)과 다를 바 없다.
  const onCopy = async () => {
    const success = await copyText(files.css);
    setCopied(success ? "ok" : "fail");
    // 기존 타이머가 있으면 취소하고 새로 시작한다
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopied("idle");
      timerRef.current = null;
    }, 2000);
  };

  return (
    <div
      data-testid="download-card"
      className="border border-neutral-200 bg-white"
      style={{
        borderRadius: "var(--ds-radius-card)",
        boxShadow: "var(--ds-shadow-raised)",
        padding: "var(--ds-space-sm)",
        display: "grid",
        gap: "var(--ds-space-xs)",
      }}
    >
      <div className="flex flex-wrap" style={{ gap: "var(--ds-space-xs)" }}>
        {items.map(([name, content, mime]) => (
          <button key={name} type="button" className={btn}
            onClick={() => downloadFile(name, content, mime)}>
            {name}
          </button>
        ))}
        <button
          type="button"
          disabled={!copyable}
          aria-describedby={copyable ? undefined : "copy-disabled-reason"}
          className="ds-type-caption-sm rounded-md border border-neutral-200 px-3 py-2
                     text-neutral-600 hover:border-neutral-300 disabled:opacity-40"
          onClick={onCopy}
        >
          {copied === "ok" ? "복사됨" : "CSS 복사"}
        </button>
      </div>
      {!copyable && (
        // id로 버튼과 연결한다(aria-describedby) — 형제 <div>로만 있으면 사유가
        // 버튼과 프로그램적으로 묶이지 않는다. disabled 버튼은 포커스를 못 받아
        // 스크린리더가 바로 읽어주진 못하지만, 관계를 명시하는 것 자체가 맞다
        // (브라우즈 모드 등에서 유효). 사유 텍스트는 neutral-500이다 —
        // 400은 2.58:1로 미달이다. 클립보드 사용 불가 이유를 못 읽으면
        // 왜 복사 버튼이 안 되는지 알 수 없으므로 장식이 아니다 (스펙 D2).
        <div id="copy-disabled-reason" className="ds-type-caption-sm text-neutral-500">
          클립보드를 쓸 수 없는 환경입니다 — 파일로 받으세요.
        </div>
      )}
      {copied === "fail" && (
        // 복사 실패도 알려야 한다 — role="status"로 aria-live 암시적 선언
        <div role="status" className="ds-type-caption-sm text-neutral-500">
          복사하지 못했습니다 — 파일로 받으세요.
        </div>
      )}
    </div>
  );
}
