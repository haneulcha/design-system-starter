import { describe, it, expect } from "vitest";
import { writePrimitiveTs, writeSemanticTs, writeComponentTs, writeIndexTs } from "../../src/generator/token-writer.js";

describe("writePrimitiveTs", () => {
  it("generates valid TypeScript with as const", () => {
    const ts = writePrimitiveTs({ colors: { blue500: "#5e6ad2", white: "#ffffff" } });
    expect(ts).toContain("export const primitive");
    expect(ts).toContain("as const");
    expect(ts).toContain('"blue500"');
    expect(ts).toContain('"#5e6ad2"');
  });
});

describe("writeSemanticTs", () => {
  it("contains primitive key refs, not hex values", () => {
    const ts = writeSemanticTs({
      light: { brandPrimary: "blue500", bgBase: "white" },
      dark: { brandPrimary: "blue500", bgBase: "darkBg" },
    });
    expect(ts).toContain("export const semantic");
    expect(ts).toContain("as const");
    expect(ts).toContain('"brandPrimary"');
    expect(ts).toContain('"blue500"');
    expect(ts).not.toContain("#5e6ad2"); // no hex in semantic
  });
});

describe("writeComponentTs", () => {
  it("contains semantic key refs", () => {
    const ts = writeComponentTs({
      button: { primary: { bg: "brandPrimary", text: "white" } },
    });
    expect(ts).toContain("export const component");
    expect(ts).toContain('"bg"');
    expect(ts).toContain('"brandPrimary"');
  });
});

describe("writeIndexTs", () => {
  it("re-exports all layers", () => {
    const ts = writeIndexTs();
    expect(ts).toContain('from "./primitive.js"');
    expect(ts).toContain('from "./semantic.js"');
    expect(ts).toContain('from "./component.js"');
  });
});
