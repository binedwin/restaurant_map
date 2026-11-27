export type Restaurant = {
  id: number;
  name: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  roadAddress: string | null;
  lat: number;
  lng: number;
  naverLink: string | null;
  sido: string;
  sigungu: string;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
};

export type RestaurantDetail = Restaurant & { distribution: Array<{ rating: number; count: number }> };

export type Review = {
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

export type ReviewInput = { nickname: string; rating: number; content: string; visitedAt: string | null };

export type LocalItem = {
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  link: string;
  lat: number;
  lng: number;
  savedId: number | null;
};

export type SortKey = "rating" | "reviews" | "recent";

export type ListParams = {
  bbox?: string;
  sido?: string;
  sigungu?: string;
  category?: string;
  minRating?: number;
  sort?: SortKey;
  page?: number;
  size?: number;
};

export type CreateRestaurant = {
  name: string;
  category?: string | null;
  phone?: string | null;
  address?: string | null;
  roadAddress?: string | null;
  lat: number;
  lng: number;
  naverLink?: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (token) headers["x-author-token"] = token;
  const res = await fetch(path, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
  if (!res.ok) throw new ApiError(res.status, data.error || `요청에 실패했습니다 (${res.status})`, data.details);
  return data as T;
}

const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: () => request<{ ok: boolean; mock: boolean }>("/api/health"),
  searchLocal: (query: string) => request<{ mock: boolean; items: LocalItem[] }>(`/api/naver/local${qs({ query })}`),
  listRestaurants: (params: ListParams) => request<{ items: Restaurant[]; total: number; page: number; size: number }>(`/api/restaurants${qs(params)}`),
  getRestaurant: (id: number) => request<RestaurantDetail>(`/api/restaurants/${id}`),
  createRestaurant: (body: CreateRestaurant) =>
    request<{ created: boolean; restaurant: Restaurant }>("/api/restaurants", { method: "POST", body: JSON.stringify(body) }),
  listReviews: (id: number, sort: "recent" | "rating", token: string) =>
    request<{ items: Review[] }>(`/api/restaurants/${id}/reviews${qs({ sort })}`, {}, token),
  createReview: (id: number, body: ReviewInput, token: string) =>
    request<Review>(`/api/restaurants/${id}/reviews`, { method: "POST", body: JSON.stringify(body) }, token),
  updateReview: (id: number, body: Partial<ReviewInput>, token: string) =>
    request<Review>(`/api/reviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),
  deleteReview: (id: number, token: string) => request<void>(`/api/reviews/${id}`, { method: "DELETE" }, token),
  regions: () => request<{ items: Array<{ sido: string; count: number }> }>("/api/regions"),
  categories: () => request<{ items: Array<{ category: string; count: number }> }>("/api/categories"),
};
