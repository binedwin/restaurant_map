// API 통합 테스트: 테스트 전용 SQLite 파일을 만들어 저장 → 후기 → 집계 → 권한 흐름을 확인한다.
// 실행: npm test (server 폴더 기준, 루트 .env 를 읽는다)
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";

const dbFile = path.resolve(process.cwd(), "prisma/test.db");
process.env.DATABASE_URL = "file:./test.db";
process.env.NAVER_MOCK = "true";

let app: import("express").Express;

beforeAll(async () => {
  for (const f of [dbFile, `${dbFile}-journal`]) if (fs.existsSync(f)) fs.unlinkSync(f);
  execSync("npx prisma db push --skip-generate", { stdio: "ignore", env: { ...process.env } });
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

afterAll(async () => {
  const { prisma } = await import("../src/lib/prisma.js");
  await prisma.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) if (fs.existsSync(f)) fs.unlinkSync(f);
});

const token = "browser-token-1234567890";
const other = "another-browser-token-0987654321";

describe("맛집 저장과 후기", () => {
  let restaurantId = 0;
  let reviewId = 0;

  it("health 는 목 모드를 알려준다", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.mock).toBe(true);
  });

  it("지역검색 프록시는 샘플 결과를 5건 이하로 돌려준다", async () => {
    const res = await request(app).get("/api/naver/local").query({ query: "냉면" });
    expect(res.status).toBe(200);
    expect(res.body.mock).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    expect(res.body.items[0].savedId).toBeNull();
  });

  it("식당을 저장하면 시/도가 추출되고, 같은 식당은 다시 만들지 않는다", async () => {
    const body = { name: "을지로 평양냉면", category: "한식>냉면", roadAddress: "서울특별시 중구 을지로 100", address: "서울특별시 중구 을지로3가 12-1", lat: 37.5663, lng: 126.9915, naverLink: "" };
    const first = await request(app).post("/api/restaurants").send(body);
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(true);
    expect(first.body.restaurant.sido).toBe("서울특별시");
    expect(first.body.restaurant.sigungu).toBe("중구");
    expect(first.body.restaurant.naverLink).toBeNull();
    restaurantId = first.body.restaurant.id;

    const second = await request(app).post("/api/restaurants").send(body);
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.restaurant.id).toBe(restaurantId);

    const search = await request(app).get("/api/naver/local").query({ query: "을지로 평양냉면" });
    expect(search.body.items[0].savedId).toBe(restaurantId);
  });

  it("잘못된 입력은 400", async () => {
    const res = await request(app).post("/api/restaurants").send({ name: "", lat: 100, lng: 0 });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("후기를 쓰면 평균 별점과 후기 수가 집계된다", async () => {
    const r1 = await request(app).post(`/api/restaurants/${restaurantId}/reviews`).set("x-author-token", token).send({ nickname: "면식가", rating: 5, content: "맛있다", visitedAt: "2026-09-01" });
    expect(r1.status).toBe(201);
    expect(r1.body.mine).toBe(true);
    reviewId = r1.body.id;

    const r2 = await request(app).post(`/api/restaurants/${restaurantId}/reviews`).set("x-author-token", other).send({ nickname: "지나가던", rating: 4, content: "괜찮다" });
    expect(r2.status).toBe(201);

    const detail = await request(app).get(`/api/restaurants/${restaurantId}`);
    expect(detail.body.reviewCount).toBe(2);
    expect(detail.body.avgRating).toBe(4.5);
    expect(detail.body.distribution.find((d: { rating: number }) => d.rating === 5).count).toBe(1);
  });

  it("토큰이 없으면 후기를 쓸 수 없다", async () => {
    const res = await request(app).post(`/api/restaurants/${restaurantId}/reviews`).send({ nickname: "익명", rating: 3, content: "..." });
    expect(res.status).toBe(401);
  });

  it("다른 브라우저 토큰으로는 수정·삭제할 수 없다", async () => {
    const patch = await request(app).patch(`/api/reviews/${reviewId}`).set("x-author-token", other).send({ rating: 1 });
    expect(patch.status).toBe(403);
    const del = await request(app).delete(`/api/reviews/${reviewId}`).set("x-author-token", other);
    expect(del.status).toBe(403);
  });

  it("같은 토큰이면 수정하고 삭제할 수 있고 집계가 따라온다", async () => {
    const patch = await request(app).patch(`/api/reviews/${reviewId}`).set("x-author-token", token).send({ rating: 3, content: "다시 가보니 보통" });
    expect(patch.status).toBe(200);
    expect(patch.body.rating).toBe(3);

    let detail = await request(app).get(`/api/restaurants/${restaurantId}`);
    expect(detail.body.avgRating).toBe(3.5);

    const list = await request(app).get(`/api/restaurants/${restaurantId}/reviews`).set("x-author-token", token);
    expect(list.body.items.filter((r: { mine: boolean }) => r.mine).length).toBe(1);

    const del = await request(app).delete(`/api/reviews/${reviewId}`).set("x-author-token", token);
    expect(del.status).toBe(204);
    detail = await request(app).get(`/api/restaurants/${restaurantId}`);
    expect(detail.body.reviewCount).toBe(1);
    expect(detail.body.avgRating).toBe(4);
  });

  it("bbox, 시/도, 별점 필터와 집계 API 가 동작한다", async () => {
    const inSeoul = await request(app).get("/api/restaurants").query({ bbox: "126.7,37.4,127.3,37.7", sido: "서울특별시", minRating: 3.5 });
    expect(inSeoul.body.total).toBe(1);
    const inBusan = await request(app).get("/api/restaurants").query({ bbox: "128.7,34.9,129.4,35.4" });
    expect(inBusan.body.total).toBe(0);
    const badBbox = await request(app).get("/api/restaurants").query({ bbox: "1,2,3" });
    expect(badBbox.status).toBe(400);

    const regions = await request(app).get("/api/regions");
    expect(regions.body.items).toEqual([{ sido: "서울특별시", count: 1 }]);
    const categories = await request(app).get("/api/categories");
    expect(categories.body.items).toEqual([{ category: "한식", count: 1 }]);
  });
});
