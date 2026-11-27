/** "한식>냉면" → "한식" */
export const topCategory = (category: string | null | undefined) => (category ?? "").split(">")[0].trim() || "기타";

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

/** 생성 직후의 updatedAt 은 createdAt 과 거의 같으므로 1초 이상 차이 날 때만 수정됨으로 본다. */
export const isEdited = (createdAt: string, updatedAt: string) => new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;

/** 목록 카드용 짧은 주소: 시/도와 시/군/구는 따로 보여 주므로 주소 앞부분에서 뺀다. */
export const shortAddress = (r: { sido: string; sigungu: string; roadAddress: string | null; address: string | null }) => {
  const full = (r.roadAddress || r.address || "").trim();
  if (!full) return "";
  const tokens = full.split(/\s+/);
  const drop = tokens.length > 2 && (tokens[0] === r.sido || r.sido.startsWith(tokens[0])) ? (tokens[1] === r.sigungu ? 2 : 1) : 0;
  return tokens.slice(drop).join(" ");
};

export const escapeHtml =(s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
