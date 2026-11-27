<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { api } from "../api";
import { REGIONS, type Region } from "../lib/regions";
import { useRestaurantStore } from "../stores/restaurants";

const emit = defineEmits<{ region: [region: Region | null] }>();

const store = useRestaurantStore();
const { filters, total, loading, bbox } = storeToRefs(store);

const categories = ref<Array<{ category: string; count: number }>>([]);
const regionCounts = ref<Record<string, number>>({});

async function refresh() {
  try {
    const [c, r] = await Promise.all([api.categories(), api.regions()]);
    categories.value = c.items;
    regionCounts.value = Object.fromEntries(r.items.map((x) => [x.sido, x.count]));
  } catch {
    /* 서버가 꺼져 있으면 필터 목록만 비워 둔다 */
  }
}

onMounted(refresh);
defineExpose({ refresh });

function onSido(e: Event) {
  const name = (e.target as HTMLSelectElement).value;
  filters.value.sido = name;
  emit("region", REGIONS.find((r) => r.name === name) ?? null);
}
</script>

<template>
  <div class="filters">
    <label class="filters__item">
      <span>지역</span>
      <select :value="filters.sido" @change="onSido">
        <option value="">전국</option>
        <option v-for="r in REGIONS" :key="r.name" :value="r.name">{{ r.short }}{{ regionCounts[r.name] ? ` (${regionCounts[r.name]})` : "" }}</option>
      </select>
    </label>
    <label class="filters__item">
      <span>카테고리</span>
      <select v-model="filters.category">
        <option value="">전체</option>
        <option v-for="c in categories" :key="c.category" :value="c.category">{{ c.category }} ({{ c.count }})</option>
      </select>
    </label>
    <label class="filters__item">
      <span>별점</span>
      <select v-model.number="filters.minRating">
        <option :value="0">전체</option>
        <option :value="3">★ 3.0 이상</option>
        <option :value="3.5">★ 3.5 이상</option>
        <option :value="4">★ 4.0 이상</option>
        <option :value="4.5">★ 4.5 이상</option>
      </select>
    </label>
    <label class="filters__item">
      <span>정렬</span>
      <select v-model="filters.sort">
        <option value="recent">최근 저장순</option>
        <option value="rating">평점순</option>
        <option value="reviews">후기 많은 순</option>
      </select>
    </label>
    <span class="filters__count">{{ loading ? "불러오는 중…" : `${bbox ? "지도 영역 내" : "저장된 맛집"} ${total}곳` }}</span>
  </div>
</template>
