<script setup lang="ts">
import type { Review } from "../api";
import { formatDate, isEdited } from "../lib/format";
import StarRating from "./StarRating.vue";

defineProps<{ reviews: Review[]; busyId?: number | null }>();
const emit = defineEmits<{ edit: [review: Review]; remove: [review: Review] }>();
</script>

<template>
  <ul class="reviews">
    <li v-for="r in reviews" :key="r.id" class="review">
      <div class="review__head">
        <strong>{{ r.nickname }}</strong>
        <span v-if="r.mine" class="tag tag--mine">내 후기</span>
        <StarRating :model-value="r.rating" :size="14" />
        <span class="muted small">{{ r.visitedAt ? `${r.visitedAt} 방문` : `${formatDate(r.createdAt)} 작성` }}</span>
        <span v-if="isEdited(r.createdAt, r.updatedAt)" class="muted small">(수정됨)</span>
      </div>
      <p class="review__body">{{ r.content }}</p>
      <div v-if="r.mine" class="review__actions">
        <button class="btn btn--ghost btn--sm" type="button" :disabled="busyId === r.id" @click="emit('edit', r)">수정</button>
        <button class="btn btn--ghost btn--sm btn--danger" type="button" :disabled="busyId === r.id" @click="emit('remove', r)">삭제</button>
      </div>
    </li>
  </ul>
</template>
