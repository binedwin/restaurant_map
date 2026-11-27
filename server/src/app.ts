import fs from "node:fs";
import path from "node:path";
import express from "express";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { metaRouter } from "./routes/meta.js";
import { naverRouter } from "./routes/naver.js";
import { restaurantsRouter } from "./routes/restaurants.js";
import { reviewsRouter } from "./routes/reviews.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", metaRouter);
  app.use("/api/naver", naverRouter);
  app.use("/api/restaurants", restaurantsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "없는 API 경로입니다." });
  });

  // 배포 시에는 빌드된 클라이언트를 같은 서버에서 제공한다 (SPA fallback 포함).
  const clientDist = [path.resolve(process.cwd(), "client/dist"), path.resolve(process.cwd(), "../client/dist")].find((p) =>
    fs.existsSync(path.join(p, "index.html")),
  );
  if (env.isProd && clientDist) {
    app.use(express.static(clientDist));
    app.use((_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
