import type { LocalItem } from "./naverLocal.js";

/** 네이버 검색 키가 없을 때 쓰는 샘플 식당. 이름과 주소는 가상이며 좌표는 해당 동네 근처다. */
export const SAMPLE_PLACES: LocalItem[] = [
  { title: "을지로 평양냉면", category: "한식>냉면", telephone: "02-1234-0001", address: "서울특별시 중구 을지로3가 12-1", roadAddress: "서울특별시 중구 을지로 100", link: "", lat: 37.5663, lng: 126.9915 },
  { title: "성수 족발집", category: "한식>족발,보쌈", telephone: "02-1234-0002", address: "서울특별시 성동구 성수동2가 300-1", roadAddress: "서울특별시 성동구 연무장길 40", link: "", lat: 37.5445, lng: 127.0565 },
  { title: "망원 파스타 식당", category: "양식>이탈리아음식", telephone: "02-1234-0003", address: "서울특별시 마포구 망원동 400-2", roadAddress: "서울특별시 마포구 망원로 50", link: "", lat: 37.5558, lng: 126.9105 },
  { title: "해운대 밀면", category: "한식>면요리", telephone: "051-1234-0004", address: "부산광역시 해운대구 중동 1200-1", roadAddress: "부산광역시 해운대구 구남로 20", link: "", lat: 35.1618, lng: 129.1605 },
  { title: "전주 한옥마을 비빔밥", category: "한식>비빔밥", telephone: "063-1234-0005", address: "전북특별자치도 전주시 완산구 교동 100-1", roadAddress: "전북특별자치도 전주시 완산구 태조로 30", link: "", lat: 35.8152, lng: 127.1532 },
  { title: "대구 안지랑 막창", category: "한식>곱창,막창", telephone: "053-1234-0006", address: "대구광역시 남구 대명동 1600-1", roadAddress: "대구광역시 남구 안지랑로16길 10", link: "", lat: 35.8395, lng: 128.5806 },
  { title: "강릉 초당 순두부", category: "한식>두부요리", telephone: "033-1234-0007", address: "강원특별자치도 강릉시 초당동 300-1", roadAddress: "강원특별자치도 강릉시 초당순두부길 20", link: "", lat: 37.7916, lng: 128.9153 },
  { title: "제주 흑돼지 연탄구이", category: "한식>육류,고기요리", telephone: "064-1234-0008", address: "제주특별자치도 제주시 노형동 900-1", roadAddress: "제주특별자치도 제주시 노형로 80", link: "", lat: 33.4851, lng: 126.4822 },
  { title: "광주 송정 떡갈비", category: "한식>육류,고기요리", telephone: "062-1234-0009", address: "광주광역시 광산구 송정동 800-1", roadAddress: "광주광역시 광산구 송정로8번길 10", link: "", lat: 35.1381, lng: 126.7948 },
  { title: "대전 튀김소보로 베이커리", category: "카페,디저트>베이커리", telephone: "042-1234-0010", address: "대전광역시 중구 은행동 150-1", roadAddress: "대전광역시 중구 대종로480번길 15", link: "", lat: 36.3276, lng: 127.4277 },
  { title: "춘천 닭갈비 골목집", category: "한식>닭요리", telephone: "033-1234-0011", address: "강원특별자치도 춘천시 조양동 50-1", roadAddress: "강원특별자치도 춘천시 금강로62번길 8", link: "", lat: 37.8783, lng: 127.7262 },
  { title: "인천 차이나타운 짜장면", category: "중식>중식당", telephone: "032-1234-0012", address: "인천광역시 중구 북성동3가 5-1", roadAddress: "인천광역시 중구 차이나타운로 40", link: "", lat: 37.4751, lng: 126.6175 },
];

export function searchMock(query: string): LocalItem[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const score = (p: LocalItem) => {
    const hay = `${p.title} ${p.category} ${p.address} ${p.roadAddress}`.toLowerCase();
    return tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
  };
  const ranked = SAMPLE_PLACES.map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
  return (ranked.length ? ranked : SAMPLE_PLACES).slice(0, 5);
}
