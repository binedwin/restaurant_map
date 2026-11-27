<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { Restaurant } from "../api";
import { shortAddress, topCategory } from "../lib/format";
import StarRating from "./StarRating.vue";

const props = defineProps<{ items: Restaurant[]; selectedId: number | null; loading: boolean; error?: string }>();
const emit = defineEmits<{ select: [id: number] }>();

const listEl = ref<HTMLElement | null>(null);

watch(
  () => props.selectedId,
  async (id) => {
    if (id == null) return;
    await nextTick();
    listEl.value?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
);
</script>

<template>
  <div ref="listEl" class="list">
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!loading && !items.length" class="list__empty">
      이 지도 영역에 저장된 맛집이 없습니다.<br />
      위 검색창에서 식당을 찾아 저장해 보세요.
    </p>
    <article
      v-for="r in items"
      :key="r.id"
      :data-id="r.id"
      class="card"
      :class="{ 'card--active': r.id === selectedId }"
      @click="emit('select', r.id)"
    >
      <div class="card__top">
        <h3 class="card__title">{{ r.name }}</h3>
        <span class="tag">{{ topCategory(r.category) }}</span>
      </div>
      <div class="card__meta">{{ r.sido }} {{ r.sigungu }}<span v-if="shortAddress(r)"> · {{ shortAddress(r) }}</span></div>
      <div class="card__bottom">
        <StarRating :model-value="r.avgRating" :size="14" />
        <span class="card__rating">{{ r.reviewCount ? r.avgRating.toFixed(1) : "아직 후기 없음" }}</span>
        <span v-if="r.reviewCount" class="muted small">후기 {{ r.reviewCount }}</span>
        <RouterLink class="card__link" :to="`/restaurants/${r.id}`" @click.stop>상세 →</RouterLink>
      </div>
    </article>
  </div>
</template>
