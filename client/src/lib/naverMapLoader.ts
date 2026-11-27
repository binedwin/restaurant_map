// 네이버 지도 SDK 를 한 번만 로드한다. 키가 없거나 인증이 실패하면 화면에서 안내할 수 있도록 상태를 알려준다.
export const mapKeyId = (import.meta.env.VITE_NAVER_MAP_KEY_ID ?? "").trim();

let loading: Promise<any> | null = null;
const authListeners = new Set<() => void>();
export let authFailed = false;

export function onNaverAuthFailure(cb: () => void) {
  authListeners.add(cb);
  if (authFailed) cb();
  return () => authListeners.delete(cb);
}

export function loadNaverMaps(): Promise<any> {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (loading) return loading;
  if (!mapKeyId) return Promise.reject(new Error("NO_KEY"));

  // 키가 틀리거나 Web 서비스 URL 이 등록되지 않으면 SDK 가 이 전역 콜백을 부른다.
  window.navermap_authFailure = () => {
    authFailed = true;
    authListeners.forEach((cb) => cb());
  };

  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(mapKeyId)}&submodules=geocoder`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new Error("LOAD_FAILURE"));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("LOAD_FAILURE"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
