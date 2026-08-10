import { describe, it, expect } from "vitest";
import { assertColorSystem } from "../../../src/export/color/types.js";
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
