import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFile, canCopy } from "./download";

describe("downloadFile", () => {
  let created: string[];
  beforeEach(() => {
    created = [];
    URL.createObjectURL = vi.fn(() => { created.push("blob:x"); return "blob:x"; });
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("attaches the anchor to the document before clicking", () => {
    let attachedAtClick = false;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      attachedAtClick = document.body.contains(this);
    };
    downloadFile("a.css", "body{}", "text/css");
    HTMLAnchorElement.prototype.click = orig;
    // Firefox는 문서에 붙지 않은 앵커의 클릭을 무시한다.
    expect(attachedAtClick).toBe(true);
  });

  it("removes the anchor afterwards", () => {
    downloadFile("a.css", "body{}", "text/css");
    expect(document.querySelectorAll("a[download]").length).toBe(0);
  });

  it("does not revoke the object URL synchronously", () => {
    downloadFile("a.css", "body{}", "text/css");
    // 동기 해제는 Firefox에서 다운로드를 취소시킨다.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe("canCopy", () => {
  it("is false when the clipboard API is absent (insecure context)", () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(canCopy()).toBe(false);
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});
