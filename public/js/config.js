const currentHost = window.location.origin;
const isProduction = currentHost.includes('vercel.app') || currentHost.includes('poolow.net');

// Google Maps API 키 (Geocoding API 활성화 필요)
export const GOOGLE_MAPS_API_KEY = "AIzaSyCOrWIMMzj31-aM2pLI0BuzDlWlxrDxgJc";

export const naverConfig = {
    clientId: "Fhq__Qo4pzeZka3tYTHt",
    callbackUrl: isProduction 
    ? `https://poolow.net/naver-callback.html` 
    : `${currentHost}/public/naver-callback.html`,
    isPopup: true,
    // loginButton: { color: "green", type: 3, height: 40 },
};

// 운영 도메인 목록 (필요에 따라 추가)
const PROD_HOSTNAMES = [
  "poolow.net",
  "www.poolow.net",
  "https://poolow.net",
  "poolow.vercel.app"
];

// 현재 환경이 운영환경인지 판별
export const IS_PRODUCTION = PROD_HOSTNAMES.includes(window.location.hostname);

// 경로 prefix (운영: "", 개발: "/public")
export const PATH_PREFIX = IS_PRODUCTION ? "" : "/public";

// HTML 파일 경로 생성 함수
export function getPageUrl(pageName, params = {}) {
  // pageName: "login.html", "index.html" 등
  // params: { poolId: 123, foo: 'bar' } 형태
  const base = `${PATH_PREFIX}/${pageName}`;
  const query = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return base + query;
}

// 자주 쓰는 페이지 경로 상수 (원하는 만큼 추가)
export const LOGIN_URL  = getPageUrl("login.html");
export const INDEX_URL  = getPageUrl("index.html");
export const DETAIL_URL = getPageUrl("detail.html");
export const MYPAGE_URL = getPageUrl("mypage.html");
export const PHONEFORM_URL = getPageUrl("phoneForm.html");
export const PROFILE_URL = getPageUrl("profile.html");
export const EDIT_NAME_URL = getPageUrl("edit-name.html");
// ... 필요시 추가

