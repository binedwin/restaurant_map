import type { Prisma } from "@prisma/client";

/** 후기가 바뀔 때마다 식당의 평균 별점과 후기 수를 같은 트랜잭션에서 다시 계산한다. */
export async function recalcRestaurant(tx: Prisma.TransactionClient, restaurantId: number) {
  const agg = await tx.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.restaurant.update({
    where: { id: restaurantId },
    data: {
      avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count._all,
    },
  });
}
