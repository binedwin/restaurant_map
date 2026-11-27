# 맛집 지도 (matzip)

전국의 맛집을 네이버 지도 위에 저장하고, 로그인 없이 닉네임으로 후기와 별점을 남기는 웹사이트입니다.
설계 문서는 [docs/DESIGN.md](docs/DESIGN.md) 에 있습니다.

- 프론트: Vue 3 + TypeScript + Vite, Pinia, Vue Router, 네이버 Maps JavaScript API v3
- 백엔드: Node 24 + Express 5 + TypeScript, Prisma 6, SQLite (배포 시 PostgreSQL)

## 1. 준비물

- Node.js 20.19 이상 (24 권장)
- 네이버 API 키 2종 (없어도 샘플 데이터로 동작합니다)

| 키 | 발급처 | 용도 |
|---|---|---|
| Maps Key ID | [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com) → AI·Application Service → Maps → Application 등록 → **Dynamic Map** 체크 → Web 서비스 URL 에 `http://localhost:5173` 추가 | 브라우저에서 지도를 그릴 때 |
| 검색 Client ID / Secret | [네이버 개발자센터](https://developers.naver.com) → 애플리케이션 등록 → 사용 API: **검색** | 서버가 식당을 찾을 때 (지역검색, 한 번에 5건, 하루 25,000회) |

## 2. 설치와 실행

```bash
npm install                 # client, server 를 한 번에 설치
copy .env.example .env      # macOS/Linux 는 cp .env.example .env
# .env 를 열어 VITE_NAVER_MAP_KEY_ID, NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET 입력 (비워 두면 샘플 모드)
npm run db:migrate          # SQLite 테이블 생성 (server/prisma/dev.db)
npm run db:seed             # 선택: 샘플 식당과 후기 넣기
npm run dev                 # 서버 http://localhost:3000 + 클라이언트 http://localhost:5173
```

브라우저에서 http://localhost:5173 을 엽니다. `/api` 요청은 Vite 가 서버로 넘겨 줍니다.

## 3. 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 서버와 클라이언트를 동시에 개발 모드로 실행 |
| `npm test` | 서버 API 통합 테스트 (별도 SQLite 파일 사용) |
| `npm run build` | 서버(tsc)와 클라이언트(vite) 빌드 |
| `npm start` | 빌드된 서버 실행. `NODE_ENV=production` 이면 `client/dist` 도 같이 제공 |
| `npm run db:migrate` | 스키마 변경을 DB 에 반영 |
| `npm run db:seed` | 샘플 데이터 입력 (이미 있으면 건너뜀) |
| `npm run db:studio --workspace server` | Prisma Studio 로 데이터 확인 |

## 4. 키 없이 써 보기 (샘플 모드)

- `NAVER_SEARCH_CLIENT_ID` 가 비어 있으면 서버가 샘플 식당 12곳으로 검색을 흉내 냅니다. 화면 상단에 "검색 샘플 모드" 표시가 붙습니다.
- `VITE_NAVER_MAP_KEY_ID` 가 비어 있으면 지도 자리에 안내가 뜨고, 검색·저장·후기 기능은 그대로 동작합니다.

## 5. API 요약

| 메서드 · 경로 | 설명 |
|---|---|
| `GET /api/naver/local?query=` | 네이버 지역검색 프록시 (좌표 변환, 저장 여부 표시) |
| `GET /api/restaurants?bbox=&sido=&category=&minRating=&sort=` | 지도 영역·필터별 목록 |
| `GET /api/restaurants/:id` | 상세 + 별점 분포 |
| `POST /api/restaurants` | 저장 (이름 + 도로명주소 중복이면 기존 식당 반환) |
| `GET/POST /api/restaurants/:id/reviews` | 후기 목록 / 작성 (`x-author-token` 헤더 필요) |
| `PATCH/DELETE /api/reviews/:id` | 같은 브라우저 토큰으로만 수정·삭제 |
| `GET /api/regions`, `GET /api/categories` | 시/도별, 카테고리별 저장 개수 |

## 6. 후기 주인 구분 방식

로그인이 없으므로 브라우저가 처음 접속할 때 임의 토큰을 만들어 `localStorage` 에 보관하고, 후기를 쓸 때 함께 보냅니다.
서버는 토큰의 SHA-256 해시만 저장하며, 같은 토큰을 보낸 요청만 수정·삭제를 허용합니다. 브라우저 데이터를 지우면 수정 권한도 사라집니다.

## 7. 배포 메모

- 서버와 정적 파일을 한 곳에서: `npm run build` 뒤 `NODE_ENV=production npm start`
- DB 를 PostgreSQL 로 바꾸려면 `server/prisma/schema.prisma` 의 `provider` 를 `postgresql` 로 바꾸고 `DATABASE_URL` 을 교체한 뒤 `npm run db:migrate`
- 배포 도메인을 네이버 클라우드 플랫폼 Maps Application 의 Web 서비스 URL 에 추가해야 지도가 뜹니다.
