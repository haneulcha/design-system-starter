// web/src/builder/BuilderPage.tsx
//
// #builder — 가이드드 팔레트 빌더 (RUI 5-pick 플로우). 렌더 전용:
// 스케일 계산·후보 생성은 전부 @core/lab/palette/builder (순수).
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  BUILDER_STEPS,
  candidatesFor,
  fillScale,
  STEP_META,
  STOP_KEYS,
  type Candidate,
  type Pin,
} from "@core/lab/palette/builder.js";
import {
  SCALE_ROLES,
  cssSnippet,
  type ScaleRole,
  type ScaleSet,
} from "@core/lab/palette/roles.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "@core/lab/palette/semantic.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { ColorScaleStrip } from "../components/ColorScaleStrip";
import { OklchPicker } from "../components/OklchPicker";

interface Choice {
  stopIndex: number;
  label: string; // 액센트 단계는 hex, 후보 단계는 후보 라벨 (여정 요약용)
}

function toStrip(pins: readonly Pin[], scale = fillScale(pins)) {
  const pinSet = new Set(pins.map((p) => p.index));
  return scale.map((c, i) => ({
    key: STOP_KEYS[i],
    hex: oklchToHex(c),
    anchor: pinSet.has(i),
  }));
}

/** 역할표의 색 칩 + stop 번호. ring = 솔리드(앵커 고정) 강조. */
function RoleChip({ hex, stop, ring }: { hex: string; stop: string; ring: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block w-3.5 h-3.5 rounded-sm border border-neutral-200 ${
          ring ? "ring-1 ring-offset-1 ring-neutral-900" : ""
        }`}
        style={{ background: hex }}
      />
      <span className="font-mono text-neutral-500">{stop}</span>
    </span>
  );
}

/** 6역할이 전부 등장하는 미니 목업 — 라이트/다크 같은 마크업, CSS 변수만 교체.
 *  컨테이너가 --accent-* 시맨틱 변수를 주입하고 내용물은 var()만 참조 —
 *  copy CSS로 가져가는 스니펫이 곧 이 목업을 그린 CSS다. */
function MockPanel({ mode, hexes }: { mode: "light" | "dark"; hexes: readonly string[] }) {
  const role = (id: ScaleRole["id"]) => SCALE_ROLES.find((r) => r.id === id)!;
  const tip = (id: ScaleRole["id"]) => {
    const r = role(id);
    return `${r.id} — 라이트 ${STOP_KEYS[r.lightIndex]} / 다크 ${STOP_KEYS[r.darkIndex]}`;
  };
  const vars = Object.fromEntries(
    SCALE_ROLES.map((r) => [
      `--accent-${r.id}`,
      hexes[mode === "light" ? r.lightIndex : r.darkIndex],
    ]),
  );
  return (
    <div
      className="flex-1 rounded border border-neutral-200 p-4 space-y-3"
      style={{ ...vars, background: mode === "light" ? "#ffffff" : "#171717" } as CSSProperties}
    >
      <div
        title={`${tip("subtle-bg")} · ${tip("border")}`}
        className="rounded border p-3 space-y-1"
        style={{ background: "var(--accent-subtle-bg)", borderColor: "var(--accent-border)" }}
      >
        <div
          title={tip("text-strong")}
          className="text-xs font-semibold"
          style={{ color: "var(--accent-text-strong)" }}
        >
          알림 카드 제목
        </div>
        <div title={tip("text")} className="text-[11px]" style={{ color: "var(--accent-text)" }}>
          링크 텍스트가 이 색으로 보입니다
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          title={tip("solid")}
          className="text-xs rounded px-3 py-1.5 text-white"
          style={{ background: "var(--accent-solid)" }}
        >
          솔리드 버튼
        </button>
        <button
          type="button"
          title={tip("hover-bg")}
          className="text-xs rounded px-3 py-1.5"
          style={{ background: "var(--accent-hover-bg)", color: "var(--accent-text-strong)" }}
        >
          호버 배경
        </button>
      </div>
    </div>
  );
}

/** 완료 화면 다크 섹션 — 역할 재배치 교보재. 계산은 roles.ts, 여긴 렌더만. */
function DarkSection({ hexes }: { hexes: readonly string[] }) {
  // TODO(task 8): 지금은 neutral·semantic 슬롯에 accent hex를 임시로 채워
  // web이 컴파일되게만 한다 — 실제 뉴트럴/시맨틱 스케일로 교체될 자리.
  const copyCss = () => navigator.clipboard.writeText(cssSnippet({
    accent: hexes,
    neutral: hexes,
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((a) => [a.id, hexes]),
    ) as ScaleSet["semantic"],
  }));
  return (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">다크 테마 — 역할 재배치</h2>
        <button
          type="button"
          onClick={copyCss}
          className="text-[10px] text-neutral-400 hover:text-neutral-700"
        >
          copy CSS
        </button>
      </div>
      <p className="text-[11px] leading-4 text-neutral-400">
        다크에서 색(프리미티브)은 그대로, 역할(시맨틱)만 재배치 — 같은 사다리를
        반대쪽에서 오른다. 규칙: 인덱스 미러(i → 10−i), 솔리드(앵커)만 자리 고정.
      </p>
      <div className="flex gap-3">
        <MockPanel mode="light" hexes={hexes} />
        <MockPanel mode="dark" hexes={hexes} />
      </div>
      <p className="text-[11px] leading-4 text-neutral-400">
        패널 배경은 고정값(#ffffff / #171717) — 실제 앱에선 뉴트럴 스케일이 이 자리.
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="font-medium py-1 pr-2">역할</th>
            <th className="font-medium py-1 pr-2">라이트</th>
            <th className="font-medium py-1 pr-2">다크</th>
            <th className="font-medium py-1">왜?</th>
          </tr>
        </thead>
        <tbody>
          {SCALE_ROLES.map((r) => (
            <tr key={r.id} className="border-t border-neutral-100 align-top">
              <td className={`py-1.5 pr-2 ${r.id === "solid" ? "font-medium text-neutral-800" : "text-neutral-600"}`}>
                {r.label}
              </td>
              <td className="py-1.5 pr-2">
                <RoleChip hex={hexes[r.lightIndex]} stop={STOP_KEYS[r.lightIndex]} ring={r.id === "solid"} />
              </td>
              <td className="py-1.5 pr-2">
                <RoleChip hex={hexes[r.darkIndex]} stop={STOP_KEYS[r.darkIndex]} ring={r.id === "solid"} />
              </td>
              <td className="py-1.5 leading-4 text-neutral-400">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BuilderPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [stepIdx, setStepIdx] = useState(0); // BUILDER_STEPS 위치, length면 완료
  const [accentHex, setAccentHex] = useState("#3b82f6");
  const [picked, setPicked] = useState<Candidate | null>(null); // 현재 단계 임시 선택

  const done = stepIdx >= BUILDER_STEPS.length;
  const stopIndex = done ? -1 : BUILDER_STEPS[stepIdx];
  const isAccentStep = stopIndex === 5;

  const candidates = useMemo(
    () => (done || isAccentStep ? [] : candidatesFor(stopIndex, pins)),
    [done, isAccentStep, stopIndex, pins],
  );

  // 하단 상시 미리보기: 확정 pin + 임시 선택 반영
  const previewPins = useMemo<Pin[]>(() => {
    if (isAccentStep && !done) {
      return [{ index: 5, color: parsePrimary(accentHex) }];
    }
    return picked ? [...pins, { index: stopIndex, color: picked.color }] : pins;
  }, [isAccentStep, done, accentHex, picked, pins, stopIndex]);

  const confirm = () => {
    if (isAccentStep) {
      const color = parsePrimary(accentHex);
      setPins([{ index: 5, color }]);
      setChoices([{ stopIndex: 5, label: accentHex }]);
    } else if (picked) {
      setPins([...pins, { index: stopIndex, color: picked.color }]);
      setChoices([...choices, { stopIndex, label: picked.label }]);
    } else {
      return;
    }
    setPicked(null);
    setStepIdx(stepIdx + 1);
  };

  /** 완료 단계로 복귀 — 이후 단계 선택은 무효화 (스펙 결정) */
  const redo = (targetStep: number) => {
    const keptStops = BUILDER_STEPS.slice(0, targetStep);
    setPins(pins.filter((p) => keptStops.includes(p.index as typeof BUILDER_STEPS[number])));
    setChoices(choices.filter((c) => keptStops.includes(c.stopIndex as typeof BUILDER_STEPS[number])));
    setPicked(null);
    setStepIdx(targetStep);
  };

  const restart = () => {
    setPins([]);
    setChoices([]);
    setPicked(null);
    setStepIdx(0);
  };

  const finalStops = done ? toStrip(pins) : null;
  const copyAll = () =>
    finalStops &&
    navigator.clipboard.writeText(finalStops.map((s) => s.hex).join(", "));

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-lg font-semibold">Guided Palette Builder</h1>
        <p className="text-xs text-neutral-500">
          Refactoring UI 순서로 액센트 스케일 만들기 — 500 → 50 → 950 → 300 → 700
        </p>
        <div className="flex gap-1.5 mt-2">
          {BUILDER_STEPS.map((s, i) => (
            <span
              key={s}
              className={`w-2 h-2 rounded-full ${
                i < stepIdx ? "bg-neutral-800" : i === stepIdx ? "bg-neutral-400" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </header>

      {/* 완료 단계 요약 */}
      {choices.map((c, i) => (
        <div
          key={c.stopIndex}
          className="flex items-center justify-between border border-neutral-200 rounded px-3 py-2 text-xs"
        >
          <span className="text-neutral-600">
            ✓ {i + 1}. {STEP_META[c.stopIndex].title} — {c.label}
          </span>
          <button
            type="button"
            onClick={() => redo(i)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            다시 고르기
          </button>
        </div>
      ))}

      {/* 현재 단계 */}
      {!done && (
        <section className="border border-neutral-300 rounded p-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium">
              {stepIdx + 1}. {STEP_META[stopIndex].title}
            </h2>
            <p className="text-[11px] leading-4 text-neutral-400 mt-1">
              {STEP_META[stopIndex].description}
            </p>
          </div>

          {isAccentStep ? (
            <div className="flex items-start gap-6">
              <OklchPicker hex={accentHex} onChange={setAccentHex} />
              <input
                value={accentHex}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccentHex(e.target.value);
                }}
                className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-24"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cd) => {
                const active = picked?.label === cd.label;
                return (
                  <label
                    key={cd.label}
                    className={`block rounded border p-2 cursor-pointer ${
                      active ? "border-neutral-800" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="candidate"
                        checked={active}
                        onChange={() => setPicked(cd)}
                      />
                      <span
                        className="inline-block w-4 h-4 rounded-sm border border-neutral-200"
                        style={{ background: oklchToHex(cd.color) }}
                      />
                      <span className="text-xs font-medium">{cd.label}</span>
                    </div>
                    <p className="text-[11px] leading-4 text-neutral-400 mb-1.5">{cd.note}</p>
                    <ColorScaleStrip
                      stops={toStrip([...pins, { index: stopIndex, color: cd.color }])}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!isAccentStep && !picked}
            className="text-xs rounded border border-neutral-800 px-3 py-1.5 disabled:opacity-30"
          >
            이 색으로 확정 →
          </button>
        </section>
      )}

      {/* 완료 화면 */}
      {done && finalStops && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">완성된 스케일</h2>
            <button
              type="button"
              onClick={copyAll}
              className="text-[10px] text-neutral-400 hover:text-neutral-700"
            >
              copy hex
            </button>
          </div>
          <ColorScaleStrip stops={finalStops} />
          <div className="text-[11px] leading-5 font-mono text-neutral-500">
            {finalStops.map((s) => (
              <div key={s.key}>
                {s.key}: {s.hex}
              </div>
            ))}
          </div>
          <DarkSection hexes={finalStops.map((s) => s.hex)} />
          <div className="text-[11px] leading-4 text-neutral-400">
            <span className="font-medium text-neutral-500">내가 고른 여정 — </span>
            {choices.map((c) => `${STEP_META[c.stopIndex].title}: ${c.label}`).join(" → ")}
          </div>
          <button
            type="button"
            onClick={restart}
            className="text-xs rounded border border-neutral-300 px-3 py-1.5 hover:border-neutral-500"
          >
            처음부터 다시
          </button>
        </section>
      )}

      {/* 하단 상시 미리보기 */}
      {previewPins.length > 0 && !done && (
        <section className="border-t border-neutral-200 pt-4">
          <h3 className="text-[11px] font-medium text-neutral-500 mb-2">
            미리보기 — 지금 상태의 스케일 (링 = 내가 확정/선택한 stop)
          </h3>
          <ColorScaleStrip stops={toStrip(previewPins)} />
        </section>
      )}
    </div>
  );
}
