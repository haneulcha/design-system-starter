// import.meta.env(BASE_URL 등)의 타입. tsconfig의 "types"로 좁히지 않는 이유는
// include가 "../src"까지 잡아서 src/cli가 ambient @types/node를 필요로 하기 때문 —
// "types"를 지정하는 순간 그게 배제되어 CLI 쪽이 TS2580으로 깨진다.
/// <reference types="vite/client" />
