// web/src/builder/BuilderPage.tsx
//
// #builder — 가이드드 팔레트 빌더 (RUI 5-pick 플로우). 렌더 전용:
// 스케일 계산·후보 생성은 전부 @core/lab/accent-scale/builder (순수).
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md

import { useMemo, useState } from "react";
import {
  BUILDER_STEPS,
  candidatesFor,
  fillScale,
  STEP_META,
  STOP_KEYS,
  type Candidate,
  type Pin,
} from "@core/lab/accent-scale/builder.js";
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
