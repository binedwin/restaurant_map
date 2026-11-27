// 데모용 초기 데이터: 샘플 식당 몇 곳과 후기. `npm run db:seed` 로 실행한다. 이미 있으면 건너뛴다.
import { PrismaClient } from "@prisma/client";
import { SAMPLE_PLACES } from "../src/services/mock.js";
import { parseRegion } from "../src/services/region.js";
import { hashToken } from "../src/services/reviews.js";

const prisma = new PrismaClient();
const seedHash = hashToken("seed-data-author-token-0001");

const REVIEWS: Record<string, Array<{ nickname: string; rating: number; content: string; visitedAt: string }>> = {
  "을지로 평양냉면": [
    { nickname: "면식가", rating: 5, content: "슴슴한 육수가 입에 착 감깁니다. 점심시간엔 줄이 길어요.", visitedAt: "2026-08-12" },
    { nickname: "직장인K", rating: 4, content: "제육이 생각보다 두툼해서 같이 시키면 든든합니다.", visitedAt: "2026-09-03" },
  ],
  "성수 족발집": [{ nickname: "성수주민", rating: 4, content: "불족발 매운맛이 딱 좋아요. 포장도 빨리 나옵니다.", visitedAt: "2026-07-21" }],
  "해운대 밀면": [{ nickname: "부산사람", rating: 5, content: "여름엔 무조건 여기. 비빔밀면 추천.", visitedAt: "2026-08-02" }],
  "전주 한옥마을 비빔밥": [{ nickname: "여행중", rating: 4, content: "놋그릇 비빔밥에 반찬이 깔끔합니다.", visitedAt: "2026-05-18" }],
  "강릉 초당 순두부": [{ nickname: "동해바다", rating: 5, content: "짬뽕순두부가 유명하지만 기본 순두부가 제일 맛있어요.", visitedAt: "2026-06-30" }],
  "제주 흑돼지 연탄구이": [{ nickname: "제주도민", rating: 4, content: "멜젓이 진짜. 양은 조금 적은 편.", visitedAt: "2026-09-15" }],
};

async function main() {
  let created = 0;
  for (const p of SAMPLE_PLACES) {
    const exists = await prisma.restaurant.findFirst({ where: { name: p.title, roadAddress: p.roadAddress } });
    if (exists) continue;
    const restaurant = await prisma.restaurant.create({
      data: {
        name: p.title,
        category: p.category,
        phone: p.telephone,
        address: p.address,
        roadAddress: p.roadAddress,
        lat: p.lat,
        lng: p.lng,
        naverLink: null,
        ...parseRegion(p.roadAddress, p.address),
      },
    });
    const reviews = REVIEWS[p.title] ?? [];
    for (const r of reviews) {
      await prisma.review.create({
        data: { restaurantId: restaurant.id, nickname: r.nickname, rating: r.rating, content: r.content, visitedAt: new Date(r.visitedAt), authorHash: seedHash },
      });
    }
    if (reviews.length) {
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          reviewCount: reviews.length,
          avgRating: Math.round((reviews.reduce((n, r) => n + r.rating, 0) / reviews.length) * 10) / 10,
        },
      });
    }
    created++;
  }
  console.log(`seed 완료: 식당 ${created}곳 추가 (총 ${await prisma.restaurant.count()}곳)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
