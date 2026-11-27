import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { api, type Restaurant, type SortKey } from "../api";

export const useRestaurantStore = defineStore("restaurants", () => {
  const items = ref<Restaurant[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref("");
  const filters = reactive({ sido: "", category: "", minRating: 0, sort: "recent" as SortKey });
  const bbox = ref("");
  const zoom = ref(7);
  const selectedId = ref<number | null>(null);

  let seq = 0;

  /** 현재 지도 영역 + 필터로 목록을 다시 불러온다. 늦게 도착한 이전 응답은 버린다. */
  async function load() {
    const my = ++seq;
    loading.value = true;
    try {
      const res = await api.listRestaurants({
        bbox: bbox.value || undefined,
        sido: filters.sido || undefined,
        category: filters.category || undefined,
        minRating: filters.minRating || undefined,
        sort: filters.sort,
        size: 200,
      });
      if (my !== seq) return;
      items.value = res.items;
      total.value = res.total;
      error.value = "";
    } catch (e) {
      if (my === seq) error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (my === seq) loading.value = false;
    }
  }

  function setBounds(nextBbox: string, nextZoom: number) {
    bbox.value = nextBbox;
    zoom.value = nextZoom;
    void load();
  }

  function upsert(r: Restaurant) {
    const i = items.value.findIndex((x) => x.id === r.id);
    if (i >= 0) items.value[i] = r;
    else {
      items.value = [r, ...items.value];
      total.value += 1;
    }
  }

  function select(id: number | null) {
    selectedId.value = id;
  }

  watch(filters, () => void load());

  return { items, total, loading, error, filters, bbox, zoom, selectedId, load, setBounds, upsert, select };
});
