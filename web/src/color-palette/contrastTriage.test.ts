import { describe, expect, it } from "vitest";
import { checkContrast, suggestRoleShifts } from "@core/color/contrast.js";
import { SCALE_ROLES } from "@core/color/roles.js";
import { deriveScales, defaultState } from "./paletteState";
import { roleLabel, triageChecks } from "./contrastTriage";

describe("triageChecks (스펙 D4)", () => {
  it("on-solid은 스케일이 조정 가능해도 '고칠 수 없는 것'이다", () => {
    const state = defaultState();
    const scales = deriveScales(state);
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    const { fixable, unfixable } = triageChecks(checks, suggestRoleShifts(scales, SCALE_ROLES));
    // 엔진의 onSolidWarning이 "stop을 옮겨 고칠 수 없다"고 못 박는다 —
    // adjustable(스케일 소유권)로 가르면 이게 맨 위로 올라와 대책 없이 남는다.
    expect(unfixable.some((c) => c.roleId === "on-solid" && c.scaleName === "accent")).toBe(true);
    expect(fixable.some((c) => c.roleId === "on-solid")).toBe(false);
  });

  it("기본 팔레트에서는 고칠 수 있는 것이 0건이다", () => {
    const scales = deriveScales(defaultState());
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    // suggestRoleShifts가 비어 있으므로 '한 번에 고치기'도 안 뜬다. 그 사실이
    // 헤드라인에 정직하게 반영돼야 한다 — "경고 10건"이 아니라 "고칠 수 있는 것 0".
    expect(triageChecks(checks, suggestRoleShifts(scales, SCALE_ROLES)).fixable).toEqual([]);
  });

  it("제안이 있는 text 실패는 '고칠 수 있는 것'이다", () => {
    const scales = deriveScales(defaultState("#f5d90a"));
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    const shifts = suggestRoleShifts(scales, SCALE_ROLES);
    expect(shifts.length).toBeGreaterThan(0);
    const { fixable } = triageChecks(checks, shifts);
    expect(fixable.length).toBeGreaterThan(0);
    expect(fixable.every((c) => c.adjustable)).toBe(true);
  });
});

describe("roleLabel", () => {
  it("엔진의 사람 말을 쓴다", () => {
    // roles.ts가 "UI 문구는 엔진에 둔다"고 적어뒀는데 뱃지가 roleId를 생으로
    // 찍고 있었다. 바로 옆 scaleName은 이미 라벨을 쓴다.
    expect(roleLabel("on-solid")).toBe("솔리드 위 글자");
    expect(roleLabel("text-strong")).toBe("진한 텍스트");
  });
  it("모르는 id는 그대로 돌려준다", () => {
    expect(roleLabel("nope")).toBe("nope");
  });
});
