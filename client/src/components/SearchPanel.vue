<script setup lang="ts">
import { ref } from "vue";
import { api, type LocalItem, type Restaurant } from "../api";
import { topCategory } from "../lib/format";

const emit = defineEmits<{ saved: [restaurant: Restaurant, created: boolean] }>();

const q = ref("");
const results = ref<LocalItem[]>([]);
const mock = ref(false);
const loading = ref(false);
const searched = ref(false);
const open = ref(false);
const error = ref("");
const savingKey = ref("");

const keyOf = (it: LocalItem) => `${it.title}|${it.roadAddress || it.address}`;

async function search() {
  const query = q.value.trim();
  if (!query) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await api.searchLocal(query);
    results.value = res.items;
    mock.value = res.mock;
    searched.value = true;
    open.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "검색에 실패했습니다.";
    open.value = true;
  } finally {
    loading.value = false;
  }
}

async function save(it: LocalItem) {
  savingKey.value = keyOf(it);
  error.value = "";
  try {
    const res = await api.createRestaurant({
      name: it.title,
      category: it.category,
      phone: it.telephone,
      address: it.address,
      roadAddress: it.roadAddress,
      lat: it.lat,
      lng: it.lng,
      naverLink: it.link,
    });
    it.savedId = res.restaurant.id;
    emit("saved", res.restaurant, res.created);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "저장에 실패했습니다.";
  } finally {
    savingKey.value = "";
  }
}
</script>

<template>
  <div class="search">
    <form class="search__form" @submit.prevent="search">
      <input
        v-model="q"
        class="search__input"
        type="search"
        maxlength="50"
        placeholder="식당 이름 또는 지역 + 음식 (예: 성수 파스타)"
        @focus="open = results.length > 0 || searched"
      />
      <button class="btn btn--primary" type="submit" :disabled="loading">{{ loading ? "검색 중…" : "검색" }}</button>
    </form>

    <div v-if="open" class="search__results">
      <div class="search__head">
        <span v-if="mock" class="tag tag--warn">샘플 결과 · 네이버 검색 키 없음</span>
        <span v-else class="tag">네이버 지역검색 · 최대 5건</span>
        <button class="btn btn--ghost btn--sm" type="button" @click="open = false">닫기</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="searched && !results.length" class="muted">검색 결과가 없습니다. 지역 이름을 함께 넣어 보세요.</p>
      <ul v-else class="search__list">
        <li v-for="it in results" :key="keyOf(it)" class="search__item">
          <div class="search__info">
            <div class="search__title">
              <strong>{{ it.title }}</strong>
              <span class="tag">{{ topCategory(it.category) }}</span>
            </div>
            <div class="search__addr">{{ it.roadAddress || it.address }}</div>
            <div v-if="it.telephone" class="muted small">{{ it.telephone }}</div>
          </div>
          <RouterLink v-if="it.savedId" class="btn btn--sm" :to="`/restaurants/${it.savedId}`">저장됨 · 보기</RouterLink>
          <button v-else class="btn btn--primary btn--sm" type="button" :disabled="savingKey === keyOf(it)" @click="save(it)">
            {{ savingKey === keyOf(it) ? "저장 중…" : "저장" }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
