<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Review, ReviewInput } from "../api";
import { useAuthorStore } from "../stores/author";
import StarRating from "./StarRating.vue";

const props = withDefaults(defineProps<{ initial?: Partial<Review> | null; busy?: boolean; submitLabel?: string; cancellable?: boolean }>(), {
  initial: null,
  busy: false,
  submitLabel: "후기 등록",
  cancellable: false,
});
const emit = defineEmits<{ submit: [input: ReviewInput]; cancel: [] }>();

const author = useAuthorStore();
const form = reactive<ReviewInput>({
  nickname: props.initial?.nickname ?? author.nickname,
  rating: props.initial?.rating ?? 0,
  content: props.initial?.content ?? "",
  visitedAt: props.initial?.visitedAt ?? null,
});
const error = ref("");

function submit() {
  error.value = "";
  if (!form.nickname.trim()) {
    error.value = "닉네임을 입력하세요.";
    return;
  }
  if (!form.rating) {
    error.value = "별점을 선택하세요.";
    return;
  }
  if (!form.content.trim()) {
    error.value = "후기 내용을 입력하세요.";
    return;
  }
  author.setNickname(form.nickname.trim());
  emit("submit", { nickname: form.nickname.trim(), rating: form.rating, content: form.content.trim(), visitedAt: form.visitedAt || null });
}

defineExpose({
  reset() {
    form.rating = 0;
    form.content = "";
    form.visitedAt = null;
  },
});
</script>

<template>
  <form class="review-form" @submit.prevent="submit">
    <div class="review-form__row">
      <label class="field">
        <span>닉네임</span>
        <input v-model="form.nickname" maxlength="20" placeholder="예: 면식가" />
      </label>
      <label class="field">
        <span>방문일</span>
        <input v-model="form.visitedAt" type="date" />
      </label>
      <div class="field">
        <span>별점</span>
        <div class="field__inline">
          <StarRating v-model="form.rating" editable :size="26" />
          <span class="muted small">{{ form.rating ? `${form.rating}점` : "별을 눌러 선택" }}</span>
        </div>
      </div>
    </div>
    <label class="field">
      <span>후기</span>
      <textarea v-model="form.content" rows="4" maxlength="1000" placeholder="맛, 분위기, 가격, 팁을 적어 주세요."></textarea>
      <span class="muted small field__counter">{{ form.content.length }} / 1000</span>
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="review-form__actions">
      <button v-if="cancellable" class="btn btn--ghost" type="button" @click="emit('cancel')">취소</button>
      <button class="btn btn--primary" type="submit" :disabled="busy">{{ busy ? "저장 중…" : submitLabel }}</button>
    </div>
  </form>
</template>
