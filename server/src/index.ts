import { env } from "./lib/env.js";
import { createApp } from "./app.js";

const app = createApp();
app.listen(env.port, () => {
  console.log(`[server] http://localhost:${env.port}  (네이버 검색: ${env.useMock ? "목 모드 - 샘플 데이터" : "실제 API"})`);
});
