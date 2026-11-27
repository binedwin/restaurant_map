import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../lib/errors.js";

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/** body/query/params 를 zod 로 검증하고, 변환된 값을 res.locals.input 에 넣는다 (Express 5 의 req.query 는 읽기 전용). */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    const input: Record<string, unknown> = {};
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return next(new HttpError(400, "입력값이 올바르지 않습니다.", details));
      }
      input[key] = result.data;
    }
    res.locals.input = input;
    next();
  };
