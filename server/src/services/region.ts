/** 주소 문자열에서 시/도와 시/군/구를 뽑는다. 전국 필터와 지역별 집계에 쓴다. */

export const SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

const ALIASES: Record<string, string> = {
  서울: "서울특별시",
  서울시: "서울특별시",
  부산: "부산광역시",
  부산시: "부산광역시",
  대구: "대구광역시",
  대구시: "대구광역시",
  인천: "인천광역시",
  인천시: "인천광역시",
  광주: "광주광역시",
  광주시: "광주광역시",
  대전: "대전광역시",
  대전시: "대전광역시",
  울산: "울산광역시",
  울산시: "울산광역시",
  세종: "세종특별자치시",
  세종시: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
};

export function normalizeSido(token: string): string | null {
  const name = ALIASES[token] ?? token;
  return (SIDO_LIST as readonly string[]).includes(name) ? name : null;
}

export function parseRegion(...addresses: Array<string | null | undefined>): { sido: string; sigungu: string } {
  for (const addr of addresses) {
    if (!addr) continue;
    const tokens = addr.trim().split(/\s+/);
    if (!tokens.length) continue;
    const sido = normalizeSido(tokens[0]);
    if (!sido) continue;
    if (sido === "세종특별자치시") return { sido, sigungu: "세종시" };
    return { sido, sigungu: tokens[1] ?? "" };
  }
  return { sido: "기타", sigungu: "" };
}
