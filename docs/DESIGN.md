# 맛집 지도 (matzip) 설계

전국의 맛집을 네이버 지도 위에 저장하고 후기를 남기는 웹사이트.
2026-10-05 확정. 결정 사항: Vue 3 + Node Express, 바탕화면 `C:\Users\SSAFY\Desktop\matzip`, 로그인 없이 닉네임만 입력.

## 1. 핵심 흐름

1. 식당 이름이나 "지역 + 음식"으로 검색한다. 서버가 네이버 지역검색 API를 대신 호출해 최대 5건을 돌려준다.
2. 결과에서 하나를 골라 저장한다. 이름과 도로명주소가 같은 식당은 다시 만들지 않고 기존 식당으로 보낸다.
3. 홈의 전국 지도에서 저장된 식당이 마커로 보인다. 지도 영역 안의 식당만 오른쪽 목록에 나오고, 줌이 낮으면 클러스터 숫자로 묶인다.
4. 식당 상세에서 닉네임, 별점, 방문일, 내용을 적어 후기를 남긴다. 평균 별점과 후기 수가 식당에 집계된다.
5. 시/도, 카테고리, 최소 별점으로 거르고 평점순, 후기 많은 순, 최신순으로 정렬한다.

## 2. 화면

| 경로 | 내용 |
|---|---|
| `/` | 지도 + 목록. 상단 검색 패널, 필터, 정렬. 마커 클릭 시 미니 카드, 카드 클릭 시 상세 이동 |
| `/restaurants/:id` | 식당 정보, 작은 지도, 평점 분포, 후기 목록, 후기 작성 폼 |

```
[홈]
┌──────────────────────────────┬──────────────────┐
│ 검색어 ______ [검색]  시/도▼ 카테고리▼ 평점▼ │ 지도 영역 내 맛집 23곳 │
│                              │ ★4.5 을지면옥  중구 │
│        네이버 지도            │ ★4.2 성수족발  성동구│
│   (마커 / 클러스터 숫자)       │ ...               │
│                  [현재 위치]  │                  │
└──────────────────────────────┴──────────────────┘
[상세]
식당명  카테고리  ★4.3 (후기 12)   [네이버에서 보기↗]
주소 · 전화                        [작은 지도]
─ 후기 작성: 닉네임  별점 ○○○○○  방문일  내용  [등록]
─ 후기 목록 (최신순 / 별점순)
```

## 3. 회원 없이 후기 주인 구분하기

로그인은 없다. 대신 브라우저가 처음 접속할 때 임의의 `authorToken`(UUID)을 만들어 localStorage에 보관하고, 후기를 쓸 때 함께 보낸다.
같은 토큰을 가진 브라우저만 그 후기를 수정·삭제할 수 있다. 토큰은 서버에 해시로만 저장하고 응답에는 내지 않는다.
브라우저 데이터를 지우면 수정 권한도 사라진다. 이 한계는 화면에 작게 안내한다.

## 4. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트 | Vue 3 + TypeScript + Vite, Pinia, Vue Router | 기존 Vue 경험과 맞음 |
| 지도 | 네이버 Maps JavaScript API v3 (`ncpKeyId`, `submodules=geocoder`) | 요구 사항 |
| 백엔드 | Node 24 + Express 5 + TypeScript, Prisma 6, zod | 이 PC에 Python이 없어 Node로 통일. 네이버 비밀키를 서버에만 둔다 |
| DB | 개발 SQLite, 배포 PostgreSQL | 설치 없이 시작. 좌표 범위 조회는 lat/lng 인덱스로 충분 |
| 실행 | 루트 `npm run dev`로 서버(3000)와 클라이언트(5173) 동시 실행, Vite 프록시로 `/api` 연결 | 개발 중 CORS 불필요 |

## 5. 네이버 API 키

| 키 | 발급처 | 쓰는 곳 | 비고 |
|---|---|---|---|
| Maps Key ID | 네이버 클라우드 플랫폼 콘솔 → Application → Maps. Dynamic Map, Geocoding, Reverse Geocoding 체크 | 프론트 지도 로드, 서버 지오코딩 | Web 서비스 URL에 `http://localhost:5173` 등록. 체크하지 않은 API는 429 |
| 검색 Client ID / Secret | 네이버 개발자센터 → 애플리케이션 → 검색 | 서버의 지역검색 프록시 | 한 번에 최대 5건, `mapx`, `mapy`를 10,000,000으로 나누면 경도, 위도. 일 25,000회 |

- 지도 스크립트: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...&submodules=geocoder`
- 인증 실패 시 `window.navermap_authFailure` 콜백이 호출된다. 화면에 키 설정 안내를 띄운다.
- 서버 REST 호출 호스트는 `maps.apigw.ntruss.com`, 헤더는 `x-ncp-apigw-api-key-id`, `x-ncp-apigw-api-key`.
- 키가 없으면 서버는 목(mock) 검색 결과(샘플 식당 10곳)를 돌려주어 화면 흐름을 테스트할 수 있다.

## 6. 데이터 모델

```prisma
model Restaurant {
  id          Int      @id @default(autoincrement())
  name        String
  category    String?
  phone       String?
  address     String?
  roadAddress String?
  lat         Float
  lng         Float
  naverLink   String?
  sido        String            // 주소에서 추출, 예: 서울특별시
  sigungu     String            // 예: 중구
  avgRating   Float    @default(0)
  reviewCount Int      @default(0)
  createdAt   DateTime @default(now())
  reviews     Review[]
  @@unique([name, roadAddress])
  @@index([lat, lng])
  @@index([sido, sigungu])
}

model Review {
  id           Int      @id @default(autoincrement())
  restaurantId Int
  nickname     String
  rating       Int      // 1~5
  content      String
  visitedAt    DateTime?
  authorHash   String   // sha256(authorToken)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  @@index([restaurantId, createdAt])
}
```

사진 업로드와 즐겨찾기는 2단계 과제로 남긴다.

## 7. API

| 메서드 · 경로 | 설명 |
|---|---|
| GET `/api/naver/local?query=` | 지역검색 프록시. 좌표 변환, 제목의 HTML 태그 제거, 이미 저장된 식당이면 `savedId` 표시. IP당 분당 30회 제한 |
| GET `/api/restaurants?bbox=minLng,minLat,maxLng,maxLat&sido=&category=&minRating=&sort=rating\|reviews\|recent&page=&size=` | 목록 |
| GET `/api/restaurants/:id` | 상세 + 별점 분포 |
| POST `/api/restaurants` | 저장. 중복이면 기존 식당과 `created: false` 반환 |
| GET `/api/restaurants/:id/reviews?sort=recent\|rating` | 후기 목록 |
| POST `/api/restaurants/:id/reviews` | 후기 작성. body: nickname, rating, content, visitedAt, authorToken |
| PATCH / DELETE `/api/reviews/:id` | 후기 수정·삭제. 같은 authorToken일 때만 |
| GET `/api/regions` | 시/도별 저장 개수 |
| GET `/api/categories` | 저장된 카테고리 목록(대분류) |
| GET `/api/health` | 상태 확인 |

## 8. 동작 세부

- 지도 `idle` 이벤트 → 300ms 디바운스 → bbox로 목록 조회 → 마커 갱신. 줌 11 이하에서는 격자 기반 클러스터 숫자만 표시.
- 시/도 선택 시 미리 정의한 17개 시/도 경계로 `fitBounds`.
- 지역 추출: 도로명주소 앞 두 토큰에서 시/도와 시/군/구를 뽑고, 짧은 이름(서울, 경기)은 정식 명칭으로 바꾼다.
- 평균 별점과 후기 수는 후기 작성·수정·삭제와 같은 트랜잭션에서 식당 행에 갱신한다.
- 모든 입력은 zod로 검증한다. 비밀키는 서버 `.env`에만 둔다.

## 9. 폴더 구조

```
matzip/
├─ client/  src/pages(Home, RestaurantDetail)
│           src/components(NaverMap, SearchPanel, RestaurantList, FilterBar, ReviewForm, ReviewList, StarRating)
│           src/stores(restaurants, map, author)  src/api/  src/lib(naverMapLoader, regions)
├─ server/  src/routes(naver, restaurants, reviews, meta)  src/services(naverLocal, region, mock)
│           src/middleware(validate, rateLimit, errorHandler)  prisma/schema.prisma
├─ docs/DESIGN.md   .env.example   package.json(workspaces)
```

## 10. 진행 순서

1. 뼈대: 모노레포, Express + Prisma + SQLite, Vue에서 지도 표시.
2. 검색 → 저장 → 지도·목록 연동(bbox, 중복 처리), 목 모드.
3. 후기 작성·수정·삭제, 평점 집계, 상세 페이지.
4. 전국 탐색: 시/도·카테고리·평점 필터, 클러스터링, 정렬.
5. 마무리: 반응형, README(키 발급 절차), API 테스트, 배포 안내.
