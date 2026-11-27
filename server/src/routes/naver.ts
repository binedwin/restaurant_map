import { Router } from "express";
import { z } from "zod";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { searchLimiter } from "../middleware/rateLimit.js";
import { searchLocal } from "../services/naverLocal.js";
import { searchMock } from "../services/mock.js";

export const naverRouter = Router();

const localQuery = z.object({ query: z.string().trim().min(1, "검색어를 입력하세요.").max(50) });

/** GET /api/naver/local?query=  — 지역검색 프록시. 이미 저장된 식당이면 savedId 를 붙인다. */
naverRouter.get("/local", searchLimiter, validate({ query: localQuery }), async (_req, res) => {
  const { query } = res.locals.input.query as z.infer<typeof localQuery>;
  const items = env.useMock ? searchMock(query) : await searchLocal(query);

  const saved = items.length
    ? await prisma.restaurant.findMany({
        where: { OR: items.map((it) => ({ name: it.title, roadAddress: it.roadAddress || null })) },
        select: { id: true, name: true, roadAddress: true },
      })
    : [];

  res.json({
    mock: env.useMock,
    items: items.map((it) => ({
      ...it,
      savedId: saved.find((s) => s.name === it.title && (s.roadAddress ?? "") === (it.roadAddress ?? ""))?.id ?? null,
    })),
  });
});
