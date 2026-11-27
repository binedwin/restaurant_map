import { Router } from "express";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { SIDO_LIST } from "../services/region.js";

export const metaRouter = Router();

metaRouter.get("/health", (_req, res) => {
  res.json({ ok: true, mock: env.useMock, time: new Date().toISOString() });
});

/** 시/도별 저장 개수. 전국 필터 뱃지에 쓴다. */
metaRouter.get("/regions", async (_req, res) => {
  const grouped = await prisma.restaurant.groupBy({ by: ["sido"], _count: { _all: true } });
  const order = [...SIDO_LIST, "기타"];
  const items = grouped
    .map((g) => ({ sido: g.sido, count: g._count._all }))
    .sort((a, b) => order.indexOf(a.sido) - order.indexOf(b.sido));
  res.json({ items });
});

/** 저장된 식당의 카테고리 대분류 ("한식>냉면" → "한식") 와 개수 */
metaRouter.get("/categories", async (_req, res) => {
  const rows = await prisma.restaurant.findMany({ select: { category: true } });
  const counts = new Map<string, number>();
  for (const { category } of rows) {
    const top = (category ?? "").split(">")[0].trim();
    if (!top) continue;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const items = [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  res.json({ items });
});
