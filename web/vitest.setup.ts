// web/vitest.setup.ts
//
// jsdom은 canvas 2D 컨텍스트를 구현하지 않는다. OklchPicker는 getContext가
// null이면 그냥 반환하도록 짜여 있어 동작에는 문제가 없지만, 스텁이 없으면
// jsdom이 "Not implemented" 오류를 테스트 출력에 찍는다. 출력은 깨끗해야 한다.

HTMLCanvasElement.prototype.getContext =
  (() => null) as unknown as HTMLCanvasElement["getContext"];

// 다운로드 경로 테스트가 Blob 내용을 동기로 확인할 수 있게 한다.
// 프로덕션 코드는 이 프로퍼티를 읽지 않는다 — 테스트 전용 관측 지점이다.
const RealBlob = globalThis.Blob;
globalThis.Blob = class extends RealBlob {
  __text: string;
  constructor(parts: BlobPart[] = [], options?: BlobPropertyBag) {
    super(parts, options);
    this.__text = parts.map(String).join("");
  }
} as unknown as typeof Blob;
