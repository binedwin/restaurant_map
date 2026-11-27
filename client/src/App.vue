<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "./api";

const mock = ref(false);

onMounted(async () => {
  try {
    mock.value = (await api.health()).mock;
  } catch {
    // 서버가 아직 안 떠 있으면 조용히 넘어간다.
  }
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <RouterLink class="brand" to="/">
        <span class="brand__mark">🍽</span>
        <span class="brand__name">맛집 지도</span>
      </RouterLink>
      <span class="app-header__sub">전국 맛집을 저장하고 후기를 남겨요</span>
      <span v-if="mock" class="tag tag--warn" title="NAVER_SEARCH_CLIENT_ID 가 비어 있어 샘플 데이터로 검색합니다">검색 샘플 모드</span>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
