import { describe, it, expect } from "vitest";
import { assertColorSystem } from "../../../src/export/color/types.js";
import { defaultResolver } from "../../../src/export/color/vars.js";
import { onSolidColor } from "../../../src/color/contrast.js";
import { fixtureSystem, tinySystem } from "./fixture.js";

describe("assertColorSystem", () => {
  it("accepts a well-formed system", () => {
    expect(() => assertColorSystem(fixtureSystem())).not.toThrow();
    expect(() => assertColorSystem(tinySystem())).not.toThrow();
  });

  it("rejects an empty stopKeys list", () => {
    const s = tinySystem();
    expect(() => assertColorSystem({ ...s, stopKeys: [] })).toThrow(/stopKeys/);
  });

  it("rejects a scale whose hex count differs from stopKeys, naming the scale", () => {
    const s = tinySystem();
    const scales = [s.scales[0], { ...s.scales[1], hexes: ["#000000"] }];
    expect(() => assertColorSystem({ ...s, scales })).toThrow(/"two"/);
  });

  it("rejects duplicate scale names — they would silently overwrite CSS variables", () => {
    const s = tinySystem();
    const scales = [s.scales[0], { ...s.scales[1], name: "one" }];
    expect(() => assertColorSystem({ ...s, scales })).toThrow(/duplicate/);
  });

  it("rejects a role index outside the stop range, naming the role and the field", () => {
    const s = tinySystem();
    const roles = [{ ...s.roles[0], darkIndex: 3 }];
    expect(() => assertColorSystem({ ...s, roles })).toThrow(/darkIndex/);
  });

  it("rejects a non-integer role index", () => {
    const s = tinySystem();
    const roles = [{ ...s.roles[0], lightIndex: 1.5 }];
    expect(() => assertColorSystem({ ...s, roles })).toThrow(/lightIndex/);
  });

  it("rejects names that are not CSS identifiers — otherwise the CSS breaks silently", () => {
    const s = tinySystem();
    expect(() =>
      assertColorSystem({ ...s, scales: [{ ...s.scales[0], name: "My Scale" }, s.scales[1]] }),
    ).toThrow(/identifier/);
    expect(() =>
      assertColorSystem({ ...s, roles: [{ ...s.roles[0], id: "Solid" }] }),
    ).toThrow(/identifier/);
  });
});

describe("assertColorSystem — contrast 역할", () => {
  it("rejects a contrast role whose `against` names no stop role", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [
        ...system.roles,
        { kind: "contrast" as const, id: "on-solid", label: "솔리드 위 글자", against: "nope" },
      ],
    };
    expect(() => assertColorSystem(broken)).toThrow(/against/);
  });

  it("rejects a contrast role pointing at another contrast role", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [
        { kind: "contrast" as const, id: "a", label: "A", against: "b" },
        { kind: "contrast" as const, id: "b", label: "B", against: "a" },
      ],
    };
    expect(() => assertColorSystem(broken)).toThrow(/stop/);
  });

  it("rejects duplicate role ids", () => {
    const system = fixtureSystem();
    const broken = { ...system, roles: [...system.roles, system.roles[0]] };
    expect(() => assertColorSystem(broken)).toThrow(/duplicate role/);
  });

  // darkRoleVars가 대비 역할을 건너뛰는 것이 이 전제 위에 서 있다.
  it("rejects a contrast role against a theme-varying stop role", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [
        ...system.roles,
        { kind: "contrast" as const, id: "on-text", label: "X", against: "text" },
      ],
    };
    expect(() => assertColorSystem(broken)).toThrow(/theme-fixed/);
  });

  it("rejects a role with no valid kind", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [...system.roles, { id: "legacy", label: "옛것", lightIndex: 0, darkIndex: 0 }],
    } as unknown as Parameters<typeof assertColorSystem>[0];
    expect(() => assertColorSystem(broken)).toThrow(/kind/);
  });
});

// 산출 코드는 엔진을 import할 수 없어 대비 계산의 사본이 생긴다. 없앨 수는 없으니
// 갈라지지 않는 것만 고정한다 (스펙 D5).
describe("defaultResolver ↔ onSolidColor", () => {
  it("agrees with the engine across the whole lightness range", () => {
    const samples = [
      "#000000", "#1d59b9", "#3b82f6", "#8b5cf6", "#fb2c36", "#6d737c",
      "#f69e00", "#00c65a", "#eab308", "#e4e6e9", "#ffffff",
    ];
    for (const hex of samples) {
      expect(defaultResolver(hex), hex).toBe(onSolidColor(hex));
    }
  });
});
