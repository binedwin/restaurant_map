import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// .env 파일은 저장소 루트 한 곳에만 둔다. server/ 에서 실행하든 루트에서 실행하든 찾도록 두 경로를 본다.
for (const candidate of [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "..", ".env")]) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, quiet: true });
    break;
  }
}

const toBool = (v: string | undefined) => v === "1" || v?.toLowerCase() === "true";

export const env = {
  port: Number(process.env.PORT || 3000),
  isProd: process.env.NODE_ENV === "production",
  naverSearchId: process.env.NAVER_SEARCH_CLIENT_ID || "",
  naverSearchSecret: process.env.NAVER_SEARCH_CLIENT_SECRET || "",
  ncpKeyId: process.env.NCP_MAPS_KEY_ID || "",
  ncpKey: process.env.NCP_MAPS_KEY || "",
  /** 검색 키가 없으면 샘플 데이터로 검색을 흉내 낸다. NAVER_MOCK 으로 강제할 수 있다. */
  get useMock(): boolean {
    const flag = process.env.NAVER_MOCK;
    if (flag && flag.trim()) return toBool(flag.trim());
    return !(this.naverSearchId && this.naverSearchSecret);
  },
};
