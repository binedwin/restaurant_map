import { env } from "../lib/env.js";
import { HttpError } from "../lib/errors.js";

export type LocalItem = {
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  link: string;
  lat: number;
  lng: number;
};

type NaverLocalResponse = {
  items: Array<{
    title: string;
    link: string;
    category: string;
    description: string;
    telephone: string;
    address: string;
    roadAddress: string;
    mapx: string;
    mapy: string;
  }>;
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

export function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m).trim();
}

/** 네이버 지역검색: 한 번에 최대 5건. mapx/mapy 는 WGS84 좌표 × 10^7 정수. */
export async function searchLocal(query: string): Promise<LocalItem[]> {
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "random");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": env.naverSearchId,
      "X-Naver-Client-Secret": env.naverSearchSecret,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(502, `네이버 지역검색 호출에 실패했습니다 (${res.status}).`, body.slice(0, 300));
  }
  const data = (await res.json()) as NaverLocalResponse;
  return (data.items ?? []).map((it) => ({
    title: stripTags(it.title),
    category: it.category ?? "",
    telephone: it.telephone ?? "",
    address: it.address ?? "",
    roadAddress: it.roadAddress ?? "",
    link: it.link ?? "",
    lng: Number(it.mapx) / 1e7,
    lat: Number(it.mapy) / 1e7,
  }));
}
