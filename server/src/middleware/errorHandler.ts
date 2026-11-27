import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details ?? null });
    return;
  }
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON 본문을 해석할 수 없습니다." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
};
