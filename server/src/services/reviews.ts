import { createHash } from "node:crypto";
import type { Review } from "@prisma/client";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type ReviewDto = {
  id: number;
  restaurantId: number;
  nickname: string;
  rating: number;
  content: string;
  visitedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
};

/** authorHash 는 절대 응답에 내지 않는다. 요청 토큰과 같으면 mine=true. */
export function toReviewDto(r: Review, tokenHash: string | null): ReviewDto {
  return {
    id: r.id,
    restaurantId: r.restaurantId,
    nickname: r.nickname,
    rating: r.rating,
    content: r.content,
    visitedAt: r.visitedAt ? r.visitedAt.toISOString().slice(0, 10) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    mine: tokenHash !== null && r.authorHash === tokenHash,
  };
}
