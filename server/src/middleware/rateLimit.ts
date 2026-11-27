import rateLimit from "express-rate-limit";

/** 네이버 검색 API 는 일 25,000 회 제한이 있어 IP 당 분당 30회로 막는다. */
export const searchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "검색 요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
});
