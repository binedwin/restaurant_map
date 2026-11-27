import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";
import { validate } from "../middleware/validate.js";
import { parseRegion } from "../services/region.js";
import { recalcRestaurant } from "../services/ratings.js";
import { hashToken, toReviewDto } from "../services/reviews.js";

export const restaurantsRouter = Router();

const idParams = z.object({ id: z.coerce.number().int().positive() });
const num = /^-?\d+(\.\d+)?$/;

const listQuery = z.object({
  bbox: z
    .string()
    .refine((s) => s.split(",").length === 4 && s.split(",").every((v) => num.test(v)), "bbox 는 minLng,minLat,maxLng,maxLat 형식입니다.")
    .optional(),
  sido: z.string().trim().max(20).optional(),
  sigungu: z.string().trim().max(20).optional(),
  category: z.string().trim().max(30).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["rating", "reviews", "recent"]).default("recent"),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(200).default(100),
});

const emptyToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const createBody = z.object({
  name: z.string().trim().min(1, "식당 이름이 필요합니다.").max(100),
  category: emptyToNull(100),
  phone: emptyToNull(30),
  address: emptyToNull(200),
  roadAddress: emptyToNull(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  naverLink: emptyToNull(500),
});

const reviewSort = z.object({ sort: z.enum(["recent", "rating"]).default("recent") });

const reviewBody = z.object({
  nickname: z.string().trim().min(1, "닉네임을 입력하세요.").max(20),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1, "후기 내용을 입력하세요.").max(1000),
  visitedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "방문일은 YYYY-MM-DD 형식입니다.")
    .optional()
    .nullable(),
});

const tokenFrom = (header: unknown): string => {
  const t = typeof header === "string" ? header.trim() : "";
  if (t.length < 16 || t.length > 80) throw new HttpError(401, "작성자 토큰이 없습니다. 페이지를 새로 고친 뒤 다시 시도하세요.");
  return t;
};

/** GET /api/restaurants — 지도 영역, 지역, 카테고리, 별점으로 거른 목록 */
restaurantsRouter.get("/", validate({ query: listQuery }), async (_req, res) => {
  const q = res.locals.input.query as z.infer<typeof listQuery>;
  const where: Prisma.RestaurantWhereInput = {};
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = q.bbox.split(",").map(Number);
    where.lat = { gte: Math.min(minLat, maxLat), lte: Math.max(minLat, maxLat) };
    where.lng = { gte: Math.min(minLng, maxLng), lte: Math.max(minLng, maxLng) };
  }
  if (q.sido) where.sido = q.sido;
  if (q.sigungu) where.sigungu = q.sigungu;
  if (q.category) where.category = { startsWith: q.category };
  if (q.minRating) where.avgRating = { gte: q.minRating };

  const orderBy: Prisma.RestaurantOrderByWithRelationInput[] =
    q.sort === "rating"
      ? [{ avgRating: "desc" }, { reviewCount: "desc" }, { id: "desc" }]
      : q.sort === "reviews"
        ? [{ reviewCount: "desc" }, { avgRating: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

  const [items, total] = await Promise.all([
    prisma.restaurant.findMany({ where, orderBy, skip: (q.page - 1) * q.size, take: q.size }),
    prisma.restaurant.count({ where }),
  ]);
  res.json({ items, total, page: q.page, size: q.size });
});

/** GET /api/restaurants/:id — 상세 + 별점 분포 */
restaurantsRouter.get("/:id", validate({ params: idParams }), async (_req, res) => {
  const { id } = res.locals.input.params as z.infer<typeof idParams>;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw new HttpError(404, "식당을 찾을 수 없습니다.");
  const grouped = await prisma.review.groupBy({ by: ["rating"], where: { restaurantId: id }, _count: { _all: true } });
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: grouped.find((g) => g.rating === rating)?._count._all ?? 0,
  }));
  res.json({ ...restaurant, distribution });
});

/** POST /api/restaurants — 저장. 이름 + 도로명주소가 같으면 기존 식당을 돌려준다. */
restaurantsRouter.post("/", validate({ body: createBody }), async (_req, res) => {
  const body = res.locals.input.body as z.infer<typeof createBody>;
  const existing = await prisma.restaurant.findFirst({
    where: body.roadAddress
      ? { name: body.name, roadAddress: body.roadAddress }
      : body.address
        ? { name: body.name, address: body.address }
        : { name: body.name, lat: body.lat, lng: body.lng },
  });
  if (existing) {
    res.status(200).json({ created: false, restaurant: existing });
    return;
  }
  const region = parseRegion(body.roadAddress, body.address);
  const restaurant = await prisma.restaurant.create({ data: { ...body, ...region } });
  res.status(201).json({ created: true, restaurant });
});

/** GET /api/restaurants/:id/reviews */
restaurantsRouter.get("/:id/reviews", validate({ params: idParams, query: reviewSort }), async (req, res) => {
  const { id } = res.locals.input.params as z.infer<typeof idParams>;
  const { sort } = res.locals.input.query as z.infer<typeof reviewSort>;
  const header = req.get("x-author-token");
  const tokenHash = header && header.trim() ? hashToken(header.trim()) : null;
  const reviews = await prisma.review.findMany({
    where: { restaurantId: id },
    orderBy: sort === "rating" ? [{ rating: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }],
  });
  res.json({ items: reviews.map((r) => toReviewDto(r, tokenHash)) });
});

/** POST /api/restaurants/:id/reviews — 로그인 없이 닉네임 + 브라우저 토큰으로 작성 */
restaurantsRouter.post("/:id/reviews", validate({ params: idParams, body: reviewBody }), async (req, res) => {
  const { id } = res.locals.input.params as z.infer<typeof idParams>;
  const body = res.locals.input.body as z.infer<typeof reviewBody>;
  const token = tokenFrom(req.get("x-author-token"));

  const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { id: true } });
  if (!restaurant) throw new HttpError(404, "식당을 찾을 수 없습니다.");

  const authorHash = hashToken(token);
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        restaurantId: id,
        nickname: body.nickname,
        rating: body.rating,
        content: body.content,
        visitedAt: body.visitedAt ? new Date(body.visitedAt) : null,
        authorHash,
      },
    });
    await recalcRestaurant(tx, id);
    return created;
  });
  res.status(201).json(toReviewDto(review, authorHash));
});
