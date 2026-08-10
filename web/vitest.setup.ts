// web/vitest.setup.ts
//
// jsdom은 canvas 2D 컨텍스트를 구현하지 않는다. OklchPicker는 getContext가
// null이면 그냥 반환하도록 짜여 있어 동작에는 문제가 없지만, 스텁이 없으면
// jsdom이 "Not implemented" 오류를 테스트 출력에 찍는다. 출력은 깨끗해야 한다.

HTMLCanvasElement.prototype.getContext =
  (() => null) as unknown as HTMLCanvasElement["getContext"];
