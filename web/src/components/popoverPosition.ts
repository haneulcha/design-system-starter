// web/src/components/popoverPosition.ts
//
// 패널은 앵커 칸 중앙에 정렬된다(translateX(-50%)). 칸이 ~53px인데 패널은 ~170px라
// 양끝 stop에서 경계 밖으로 나간다. 넘치는 만큼만 되밀어 넣는다.
//
// 경계는 뷰포트가 아니라 띠 컨테이너다. 이 도구의 액센트 띠는 608px 컬럼 안에
// 있고 그 오른쪽엔 sticky 목업이 붙어 있다 — 뷰포트 기준으로 재면 clamp가 아예
// 발동하지 않은 채 패널이 목업을 덮는다. 그 목업이 후보를 hover하며 보는 대상이라
// 가리면 이 화면의 목적을 거스른다.

export interface Bounds {
  readonly left: number;
  readonly right: number;
}

/** 패널을 경계 안으로 되미는 x 오프셋(px). 되밀 필요·여지가 없으면 0. */
export function clampOffset(panel: Bounds, boundary: Bounds): number {
  // 패널이 경계보다 넓으면 어느 쪽으로 밀어도 반대쪽이 더 나간다.
  if (panel.right - panel.left >= boundary.right - boundary.left) return 0;
  if (panel.left < boundary.left) return boundary.left - panel.left;
  if (panel.right > boundary.right) return boundary.right - panel.right;
  return 0;
}
