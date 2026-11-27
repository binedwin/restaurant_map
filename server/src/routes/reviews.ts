import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";
import { validate } from "../middleware/validate.js";
import { recalcRestaurant } from "../services/ratings.js";
import { hashToken, toReviewDto } from "../services/reviews.js";

export const reviewsRouter = Router();

const idParams = z.object({ id: z.coerce.number().int().positive() });

const patchBody = z
  .object({
    nickname: z.string().trim().min(1).max(20).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    content: z.string().trim().min(1).max(1000).optional(),
    visitedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "방문일은 YYYY-MM-DD 형식입니다.")
      .optional()
      .nullable(),
  })
  .refine((b) => Object.keys(b).length > 0, "수정할 내용이 없습니다.");

const requireToken = (header: unknown): string => {
  const t = typeof header === "string" ? header.trim() : "";
  if (t.length < 16 || t.length > 80) throw new HttpError(401, "작성자 토큰이 없습니다.");
  return t;
};

async function loadOwned(id: number, token: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new HttpError(404, "후기를 찾을 수 없습니다.");
  const tokenHash = hashToken(token);
  if (review.authorHash !== tokenHash) throw new HttpError(403, "이 브라우저에서 작성한 후기만 수정하거나 삭제할 수 있습니다.");
  return { review, tokenHash };
}

/** PATCH /api/reviews/:id */
reviewsRouter.patch("/:id", validate({ params: idParams, body: patchBody }), async (req, res) => {
  const { id } = res.locals.input.params as z.infer<typeof idParams>;
  const body = res.locals.input.body as z.infer<typeof patchBody>;
  const { review, tokenHash } = await loadOwned(id, requireToken(req.get("x-author-token")));

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.review.update({
      where: { id },
      data: {
        ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.visitedAt !== undefined ? { visitedAt: body.visitedAt ? new Date(body.visitedAt) : null } : {}),
      },
    });
    await recalcRestaurant(tx, review.restaurantId);
    return u;
  });
  res.json(toReviewDto(updated, tokenHash));
});

/** DELETE /api/reviews/:id */
reviewsRouter.delete("/:id", validate({ params: idParams }), async (req, res) => {
  const { id } = res.locals.input.params as z.infer<typeof idParams>;
  const { review } = await loadOwned(id, requireToken(req.get("x-author-token")));
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recalcRestaurant(tx, review.restaurantId);
  });
  res.status(204).end();
});
