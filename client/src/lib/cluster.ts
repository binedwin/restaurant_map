// 격자(grid) 기반 마커 클러스터링. 웹 메르카토르 화면 좌표에서 gridPx 크기의 칸에 들어가는 점을 하나로 묶는다.
export type Point = { lat: number; lng: number };
export type Cluster<T extends Point> = { key: string; lat: number; lng: number; items: T[] };

export function clusterByGrid<T extends Point>(points: T[], zoom: number, gridPx = 80): Cluster<T>[] {
  const scale = 256 * Math.pow(2, zoom);
  const cells = new Map<string, Cluster<T>>();
  for (const p of points) {
    const x = ((p.lng + 180) / 360) * scale;
    const sin = Math.sin((p.lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const key = `${Math.floor(x / gridPx)}:${Math.floor(y / gridPx)}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { key, lat: 0, lng: 0, items: [] };
      cells.set(key, cell);
    }
    cell.items.push(p);
  }
  for (const c of cells.values()) {
    c.lat = c.items.reduce((n, p) => n + p.lat, 0) / c.items.length;
    c.lng = c.items.reduce((n, p) => n + p.lng, 0) / c.items.length;
  }
  return [...cells.values()];
}
