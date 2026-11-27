/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_NAVER_MAP_KEY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  // 네이버 지도 SDK 는 전역 naver.maps 로 들어온다. 필요한 부분만 any 로 쓴다.
  naver?: any;
  navermap_authFailure?: () => void;
}
