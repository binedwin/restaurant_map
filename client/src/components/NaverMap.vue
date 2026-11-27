<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { Restaurant } from "../api";
import { clusterByGrid } from "../lib/cluster";
import { escapeHtml, topCategory } from "../lib/format";
import { loadNaverMaps, onNaverAuthFailure } from "../lib/naverMapLoader";

type Bounds = { sw: [number, number]; ne: [number, number] };

const props = withDefaults(
  defineProps<{
    restaurants: Restaurant[];
    selectedId?: number | null;
    cluster?: boolean;
    center?: [number, number];
    zoom?: number;
    fitTo?: Bounds | null;
    focus?: { lat: number; lng: number; zoom?: number } | null;
    interactive?: boolean;
  }>(),
  { selectedId: null, cluster: true, center: () => [36.2, 127.8], zoom: 7, fitTo: null, focus: null, interactive: true },
);

const emit = defineEmits<{
  boundsChange: [bbox: string, zoom: number];
  select: [id: number];
  ready: [];
  unavailable: [reason: string];
}>();

const router = useRouter();
const mapEl = ref<HTMLDivElement | null>(null);
const status = ref<"loading" | "ready" | "nokey" | "authfail" | "error">("loading");

let maps: any = null;
let map: any = null;
let infoWindow: any = null;
let markers: any[] = [];
let idleListener: any = null;
let timer: number | undefined;
let stopAuthWatch: (() => void) | null = null;

onMounted(async () => {
  try {
    maps = await loadNaverMaps();
  } catch (e) {
    const reason = e instanceof Error ? e.message : "LOAD_FAILURE";
    status.value = reason === "NO_KEY" ? "nokey" : "error";
    emit("unavailable", reason);
    return;
  }
  stopAuthWatch = onNaverAuthFailure(() => {
    status.value = "authfail";
    emit("unavailable", "AUTH_FAILURE");
  });

  map = new maps.Map(mapEl.value, {
    center: new maps.LatLng(props.center[0], props.center[1]),
    zoom: props.zoom,
    minZoom: 6,
    zoomControl: props.interactive,
    zoomControlOptions: { position: maps.Position.RIGHT_CENTER },
    mapDataControl: false,
    scaleControl: false,
    draggable: props.interactive,
    scrollWheel: props.interactive,
    pinchZoom: props.interactive,
    keyboardShortcuts: props.interactive,
    disableDoubleClickZoom: !props.interactive,
  });
  infoWindow = new maps.InfoWindow({
    content: "",
    borderWidth: 0,
    disableAnchor: true,
    backgroundColor: "transparent",
    pixelOffset: new maps.Point(0, -6),
  });
  idleListener = maps.Event.addListener(map, "idle", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(emitBounds, 300);
  });

  status.value = "ready";
  emit("ready");
  if (props.fitTo) fit(props.fitTo);
  render();
  emitBounds();
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  stopAuthWatch?.();
  if (maps && idleListener) maps.Event.removeListener(idleListener);
  clearMarkers();
  map = null;
});

function emitBounds() {
  if (!map) return;
  const b = map.getBounds();
  const sw = b.getSW();
  const ne = b.getNE();
  emit("boundsChange", `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`, map.getZoom());
}

function clearMarkers() {
  for (const m of markers) m.setMap(null);
  markers = [];
  infoWindow?.close();
}

function fit(b: Bounds) {
  if (!map) return;
  const bounds = new maps.LatLngBounds(new maps.LatLng(b.sw[0], b.sw[1]), new maps.LatLng(b.ne[0], b.ne[1]));
  map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
}

function render() {
  if (!map) return;
  clearMarkers();
  const zoom = map.getZoom();
  const useCluster = props.cluster && zoom <= 12 && props.restaurants.length > 1;
  if (!useCluster) {
    for (const r of props.restaurants) addPin(r);
    return;
  }
  for (const c of clusterByGrid(props.restaurants, zoom)) {
    if (c.items.length === 1) {
      addPin(c.items[0]);
      continue;
    }
    const size = c.items.length >= 100 ? 56 : c.items.length >= 10 ? 46 : 38;
    const marker = new maps.Marker({
      position: new maps.LatLng(c.lat, c.lng),
      map,
      icon: {
        content: `<div class="cluster" style="width:${size}px;height:${size}px">${c.items.length}</div>`,
        anchor: new maps.Point(size / 2, size / 2),
      },
      zIndex: 50,
    });
    maps.Event.addListener(marker, "click", () => {
      map.morph(new maps.LatLng(c.lat, c.lng), Math.min(zoom + 2, 19));
    });
    markers.push(marker);
  }
}

function addPin(r: Restaurant) {
  const active = r.id === props.selectedId;
  const badge = r.reviewCount ? `★ ${r.avgRating.toFixed(1)}` : "NEW";
  const marker = new maps.Marker({
    position: new maps.LatLng(r.lat, r.lng),
    map,
    title: r.name,
    icon: {
      content: `<div class="pin${active ? " pin--active" : ""}"><span class="pin__badge">${badge}</span><span class="pin__name">${escapeHtml(r.name)}</span><span class="pin__tail"></span></div>`,
      anchor: new maps.Point(16, 46),
    },
    zIndex: active ? 200 : 100,
  });
  maps.Event.addListener(marker, "click", () => {
    emit("select", r.id);
    openInfo(r, marker);
  });
  markers.push(marker);
  if (active && props.interactive) openInfo(r, marker);
}

function openInfo(r: Restaurant, marker: any) {
  if (!infoWindow || !map) return;
  infoWindow.setContent(
    `<div class="info-card">
      <strong>${escapeHtml(r.name)}</strong>
      <div class="info-card__meta">${escapeHtml(topCategory(r.category))} · ${escapeHtml(r.sido)} ${escapeHtml(r.sigungu)}</div>
      <div class="info-card__rating">★ ${r.reviewCount ? r.avgRating.toFixed(1) : "-"} <span>후기 ${r.reviewCount}개</span></div>
      <a class="info-card__link" href="/restaurants/${r.id}" data-go="${r.id}">상세 보기 →</a>
    </div>`,
  );
  infoWindow.open(map, marker);
  const el: HTMLElement | undefined = infoWindow.getContentElement?.();
  el?.querySelector("[data-go]")?.addEventListener("click", (e: Event) => {
    e.preventDefault();
    router.push(`/restaurants/${r.id}`);
  });
}

function locate() {
  if (!map) return;
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => map.morph(new maps.LatLng(pos.coords.latitude, pos.coords.longitude), 14),
    () => alert("현재 위치를 가져올 수 없습니다. 위치 권한을 확인하세요."),
  );
}

watch(() => props.restaurants, render);
watch(
  () => props.selectedId,
  (id) => {
    render();
    if (id == null || !map) return;
    const r = props.restaurants.find((x) => x.id === id);
    if (!r) return;
    const pos = new maps.LatLng(r.lat, r.lng);
    if (!map.getBounds().hasLatLng(pos)) map.panTo(pos);
  },
);
watch(
  () => props.fitTo,
  (b) => {
    if (b) fit(b);
  },
);
watch(
  () => props.focus,
  (f) => {
    if (f && map) map.morph(new maps.LatLng(f.lat, f.lng), f.zoom ?? 15);
  },
);
</script>

<template>
  <div class="map-wrap">
    <div ref="mapEl" class="map-canvas"></div>
    <button v-if="status === 'ready' && interactive" class="map-locate" type="button" @click="locate">◎ 현재 위치</button>
    <div v-if="status === 'loading'" class="map-notice map-notice--soft">지도를 불러오는 중…</div>
    <div v-else-if="status !== 'ready'" class="map-notice">
      <strong v-if="status === 'nokey'">네이버 지도 키가 없습니다</strong>
      <strong v-else-if="status === 'authfail'">네이버 지도 인증에 실패했습니다</strong>
      <strong v-else>지도를 불러오지 못했습니다</strong>
      <p v-if="status === 'nokey'">
        루트 <code>.env</code> 의 <code>VITE_NAVER_MAP_KEY_ID</code> 에 네이버 클라우드 플랫폼 Maps 의 Key ID 를 넣고 개발 서버를 다시 시작하세요.
      </p>
      <p v-else-if="status === 'authfail'">
        Key ID 가 맞는지, 네이버 클라우드 플랫폼 콘솔의 Web 서비스 URL 에 <code>http://localhost:5173</code> 이 등록됐는지 확인하세요.
      </p>
      <p v-else>네트워크 상태를 확인한 뒤 새로 고침하세요.</p>
      <p class="map-notice__sub">지도 없이도 검색, 저장, 후기 작성은 모두 동작합니다.</p>
    </div>
  </div>
</template>
