<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import type { Restaurant } from "../api";
import { KOREA, type Region } from "../lib/regions";
import { useRestaurantStore } from "../stores/restaurants";
import NaverMap from "../components/NaverMap.vue";
import SearchPanel from "../components/SearchPanel.vue";
import FilterBar from "../components/FilterBar.vue";
import RestaurantList from "../components/RestaurantList.vue";

const store = useRestaurantStore();
const { items, loading, error, selectedId } = storeToRefs(store);

const filterBar = ref<InstanceType<typeof FilterBar> | null>(null);
const fitTo = ref<{ sw: [number, number]; ne: [number, number] } | null>(null);
const focus = ref<{ lat: number; lng: number; zoom?: number } | null>(null);

function onBounds(bbox: string, zoom: number) {
  store.setBounds(bbox, zoom);
}

// 지도 키가 없어도 목록은 보여야 하므로 영역 조건 없이 불러온다.
function onUnavailable() {
  void store.load();
}

function onSaved(r: Restaurant) {
  store.upsert(r);
  store.select(r.id);
  focus.value = { lat: r.lat, lng: r.lng, zoom: 15 };
  filterBar.value?.refresh();
}

function onRegion(region: Region | null) {
  const target = region ?? KOREA;
  fitTo.value = { sw: target.sw, ne: target.ne };
}
</script>

<template>
  <div class="home">
    <section class="home__top">
      <SearchPanel @saved="onSaved" />
      <FilterBar ref="filterBar" @region="onRegion" />
    </section>
    <section class="home__body">
      <NaverMap
        class="home__map"
        :restaurants="items"
        :selected-id="selectedId"
        :fit-to="fitTo"
        :focus="focus"
        @bounds-change="onBounds"
        @select="store.select"
        @unavailable="onUnavailable"
      />
      <aside class="home__list">
        <RestaurantList :items="items" :selected-id="selectedId" :loading="loading" :error="error" @select="store.select" />
      </aside>
    </section>
  </div>
</template>
