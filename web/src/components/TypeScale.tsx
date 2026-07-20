import { useEffect, useState } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import { loadGoogleFont, primaryFontName, weightLabel } from "../lib/tokens";

const DISPLAY_KEYS = [
  "heading.xl",
  "heading.lg",
  "heading.md",
  "heading.sm",
  "heading.xs",
  "heading.xxs",
  "body.lg",
  "body.md",
  "body.sm",
  "caption.md",
  "caption.sm",
  "caption.xs",
  "caption.xxs",
] as const;

type Lang = "en" | "ko";

const SAMPLE_TEXT: Record<Lang, string> = {
  ko: "다람쥐 헌 쳇바퀴에 타고파",
  en: "The quick brown fox",
};

export function TypeScale({ system }: { system: DesignSystem }) {
  const primaryFont = primaryFontName(system);
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  const profiles = system.typographyTokens.profiles;
  const sample = SAMPLE_TEXT[lang];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-400 uppercase tracking-wider">
          Type Scale — {primaryFont}
        </div>
        <div
          role="group"
          aria-label="Sample text language"
          className="inline-flex items-center gap-0.5 p-0.5 bg-neutral-100 rounded text-2xs"
        >
          {(["ko", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={[
                "px-2 py-0.5 rounded transition-colors",
                lang === l
                  ? "bg-white text-neutral-900 shadow-sm font-medium"
                  : "text-neutral-500 hover:text-neutral-900",
              ].join(" ")}
              aria-pressed={lang === l}
            >
              {l === "en" ? "영" : "한"}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-1">
        {DISPLAY_KEYS.filter((k) => profiles[k]).map((key) => {
          const t = profiles[key];
          return (
            <li key={key} className="flex items-center gap-1 min-w-0">
              <span className="font-mono text-2xs text-neutral-400 shrink-0 w-24 tabular-nums">
                {key} · {t.size}/
                {weightLabel(t.weight).slice(0, 3).toLowerCase()}
              </span>
              <span
                className="truncate text-neutral-900"
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: t.size,
                  fontWeight: t.weight,
                  letterSpacing: t.letterSpacing,
                  lineHeight: t.lineHeight,
                }}
              >
                {sample}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
