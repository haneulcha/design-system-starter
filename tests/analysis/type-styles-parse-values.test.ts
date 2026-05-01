import { describe, it, expect } from "vitest";
import {
  parseSize,
  parseWeight,
  parseLineHeight,
  parseLetterSpacing,
} from "../../scripts/analysis/type-styles/parse-values.js";

describe("parseSize", () => {
  it("extracts px from '16px (1.00rem)'", () => {
    expect(parseSize("16px (1.00rem)")).toEqual({ value: 16 });
  });
  it("extracts px from '64px'", () => {
    expect(parseSize("64px")).toEqual({ value: 64 });
  });
  it("returns null for empty or unparseable", () => {
    expect(parseSize("")).toEqual({ value: null });
    expect(parseSize("normal")).toEqual({ value: null });
  });
});

describe("parseWeight", () => {
  it("extracts plain integer", () => {
    expect(parseWeight("510")).toEqual({ value: 510 });
  });
  it("extracts integer with annotation", () => {
    expect(parseWeight("300 (Light)")).toEqual({ value: 300 });
  });
  it("parses range '400-510' into range only", () => {
    expect(parseWeight("400-510")).toEqual({ value: null, range: [400, 510] });
  });
  it("parses range '400–590' (en-dash)", () => {
    expect(parseWeight("400–590")).toEqual({ value: null, range: [400, 590] });
  });
  it("returns null on unparseable", () => {
    expect(parseWeight("normal")).toEqual({ value: null });
  });
});

describe("parseLineHeight", () => {
  it("extracts plain number", () => {
    expect(parseLineHeight("1.50")).toEqual({ value: 1.5 });
  });
  it("strips annotation '(relaxed)'", () => {
    expect(parseLineHeight("1.50 (relaxed)")).toEqual({ value: 1.5 });
  });
  it("strips px annotation '(70px)'", () => {
    expect(parseLineHeight("1.17 (70px)")).toEqual({ value: 1.17 });
  });
  it("parses range '1.33-1.45'", () => {
    expect(parseLineHeight("1.33-1.45")).toEqual({ value: null, range: [1.33, 1.45] });
  });
  it("treats 'normal' as null", () => {
    expect(parseLineHeight("normal")).toEqual({ value: null });
  });
  it("returns null when range syntax matches but values are out of plausible LH bounds", () => {
    expect(parseLineHeight("0.3-4.5")).toEqual({ value: null });
  });
});

describe("parseLetterSpacing", () => {
  it("extracts negative px", () => {
    expect(parseLetterSpacing("-1.584px")).toEqual({ value: -1.584 });
  });
  it("treats 'normal' as 0", () => {
    expect(parseLetterSpacing("normal")).toEqual({ value: 0 });
  });
  it("treats '0' as 0", () => {
    expect(parseLetterSpacing("0")).toEqual({ value: 0 });
  });
  it("flags uppercase annotation", () => {
    expect(parseLetterSpacing("0.32px (uppercase)")).toEqual({
      value: 0.32,
      uppercase: true,
    });
  });
  it("parses range '-2.4px to -2.88px'", () => {
    expect(parseLetterSpacing("-2.4px to -2.88px")).toEqual({
      value: null,
      range: [-2.88, -2.4],
    });
  });
});
