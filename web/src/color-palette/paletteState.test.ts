import { describe, it, expect } from "vitest";
import { defaultState, withAccent, type PaletteState } from "./paletteState";

describe("withAccent", () => {
  // pin은 특정 액센트에서 파생된 색이다. 액센트가 바뀌면 fillScale의 hue 보간이
  // 옛 액센트와 새 액센트를 섞어버리므로 pin을 전부 버려야 한다.
  it("discards every pin", () => {
    const state: PaletteState = {
      ...defaultState("#3b82f6"),
      pins: { 0: "#f3f8ff", 3: "#9dc3ff", 7: "#5a8fe0", 10: "#0f274e" },
    };
    const next = withAccent(state, "#ff0000");
    expect(next.pins).toEqual({ 0: undefined, 3: undefined, 7: undefined, 10: undefined });
  });

  // tint는 사용자가 명시적으로 고른 축이다 — 안 골랐으면 애초에 null이라 새
  // 액센트에서 다시 스냅되므로, 여기서 유지해도 자동 재계산을 막지 않는다.
  it("keeps the tint", () => {
    const state: PaletteState = { ...defaultState("#3b82f6"), tint: { attractorId: "cool", strength: "strong" } };
    const next = withAccent(state, "#ff0000");
    expect(next.tint).toEqual({ attractorId: "cool", strength: "strong" });
  });

  // 역할 이동은 특정 색이 아니라 "이 시스템은 텍스트를 몇 번째 자리에 둔다"는
  // 시스템 전체의 진술이라 액센트가 바뀌어도 무효화될 이유가 없다.
  it("keeps the role shifts", () => {
    const state: PaletteState = {
      ...defaultState("#3b82f6"),
      shifts: [{ roleId: "text", theme: "light", to: 8 }],
    };
    const next = withAccent(state, "#ff0000");
    expect(next.shifts).toEqual([{ roleId: "text", theme: "light", to: 8 }]);
  });

  // 존재 이유 그 자체: 액센트 교체가 실제로 반영돼야 한다.
  it("replaces the accent", () => {
    const next = withAccent(defaultState("#3b82f6"), "#ff0000");
    expect(next.accentHex).toBe("#ff0000");
  });

  // 원본 상태 객체는 불변으로 다뤄야 다른 곳(예: undo 스택)이 옛 상태를
  // 계속 참조해도 안전하다.
  it("does not mutate the original state", () => {
    const state: PaletteState = {
      ...defaultState("#3b82f6"),
      pins: { 0: "#f3f8ff", 3: undefined, 7: undefined, 10: undefined },
    };
    const frozen = JSON.parse(JSON.stringify(state));
    withAccent(state, "#ff0000");
    expect(state).toEqual(frozen);
  });
});
