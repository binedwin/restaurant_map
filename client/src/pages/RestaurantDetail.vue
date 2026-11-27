<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { api, ApiError, type RestaurantDetail, type Review, type ReviewInput } from "../api";
import { topCategory } from "../lib/format";
import { useAuthorStore } from "../stores/author";
import NaverMap from "../components/NaverMap.vue";
import StarRating from "../components/StarRating.vue";
import ReviewForm from "../components/ReviewForm.vue";
import ReviewList from "../components/ReviewList.vue";

const props = defineProps<{ id: string }>();
const author = useAuthorStore();

const restaurant = ref<RestaurantDetail | null>(null);
const reviews = ref<Review[]>([]);
const sort = ref<"recent" | "rating">("recent");
const loading = ref(true);
const error = ref("");
const busy = ref(false);
const busyId = ref<number | null>(null);
const editing = ref<Review | null>(null);
const notice = ref("");
const formRef = ref<InstanceType<typeof ReviewForm> | null>(null);

const rid = computed(() => Number(props.id));
const maxCount = computed(() => Math.max(1, ...(restaurant.value?.distribution.map((d) => d.count) ?? [0])));

async function fetchAll() {
  const [r, rv] = await Promise.all([api.getRestaurant(rid.value), api.listReviews(rid.value, sort.value, author.token)]);
  restaurant.value = r;
  reviews.value = rv.items;
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    await fetchAll();
  } catch (e) {
    error.value = e instanceof ApiError && e.status === 404 ? "식당을 찾을 수 없습니다." : e instanceof Error ? e.message : "불러오기에 실패했습니다.";
  } finally {
    loading.value = false;
  }
}

async function create(input: ReviewInput) {
  busy.value = true;
  notice.value = "";
  try {
    await api.createReview(rid.value, input, author.token);
    await fetchAll();
    formRef.value?.reset();
    notice.value = "후기를 등록했습니다.";
  } catch (e) {
    notice.value = e instanceof Error ? e.message : "등록에 실패했습니다.";
  } finally {
    busy.value = false;
  }
}

async function update(input: ReviewInput) {
  if (!editing.value) return;
  busyId.value = editing.value.id;
  notice.value = "";
  try {
    await api.updateReview(editing.value.id, input, author.token);
    editing.value = null;
    await fetchAll();
    notice.value = "후기를 수정했습니다.";
  } catch (e) {
    notice.value = e instanceof Error ? e.message : "수정에 실패했습니다.";
  } finally {
    busyId.value = null;
  }
}

async function remove(r: Review) {
  if (!confirm("이 후기를 삭제할까요?")) return;
  busyId.value = r.id;
  notice.value = "";
  try {
    await api.deleteReview(r.id, author.token);
    await fetchAll();
    notice.value = "후기를 삭제했습니다.";
  } catch (e) {
    notice.value = e instanceof Error ? e.message : "삭제에 실패했습니다.";
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
watch(rid, load);
watch(sort, () => void fetchAll());
</script>

<template>
  <div class="detail">
    <RouterLink class="detail__back" to="/">← 지도로 돌아가기</RouterLink>
    <p v-if="loading" class="muted">불러오는 중…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="restaurant">
      <header class="detail__head">
        <div class="detail__summary">
          <span class="tag">{{ topCategory(restaurant.category) }}</span>
          <h1 class="detail__title">{{ restaurant.name }}</h1>
          <div class="detail__rating">
            <StarRating :model-value="restaurant.avgRating" :size="22" />
            <strong>{{ restaurant.reviewCount ? restaurant.avgRating.toFixed(1) : "-" }}</strong>
            <span class="muted">후기 {{ restaurant.reviewCount }}개</span>
          </div>
          <dl class="detail__info">
            <div>
              <dt>주소</dt>
              <dd>
                {{ restaurant.roadAddress || restaurant.address || "-" }}
                <span v-if="restaurant.roadAddress && restaurant.address" class="muted small">(지번 {{ restaurant.address }})</span>
              </dd>
            </div>
            <div v-if="restaurant.phone">
              <dt>전화</dt>
              <dd><a :href="`tel:${restaurant.phone}`">{{ restaurant.phone }}</a></dd>
            </div>
            <div>
              <dt>지역</dt>
              <dd>{{ restaurant.sido }} {{ restaurant.sigungu }}</dd>
            </div>
          </dl>
          <div class="detail__links">
            <a v-if="restaurant.naverLink" class="btn btn--sm" :href="restaurant.naverLink" target="_blank" rel="noopener">네이버에서 보기 ↗</a>
            <a class="btn btn--sm" :href="`https://map.naver.com/p/search/${encodeURIComponent(restaurant.name)}`" target="_blank" rel="noopener">네이버 지도에서 검색 ↗</a>
          </div>
        </div>
        <NaverMap class="detail__map" :restaurants="[restaurant]" :cluster="false" :center="[restaurant.lat, restaurant.lng]" :zoom="16" :interactive="false" />
      </header>

      <section class="detail__grid">
        <div class="panel">
          <h2>별점 분포</h2>
          <ul class="dist">
            <li v-for="d in restaurant.distribution" :key="d.rating">
              <span class="dist__label">{{ d.rating }}점</span>
              <span class="dist__bar"><span :style="{ width: `${(d.count / maxCount) * 100}%` }"></span></span>
              <span class="muted small">{{ d.count }}</span>
            </li>
          </ul>
        </div>
        <div class="panel">
          <h2>{{ editing ? "후기 수정" : "후기 남기기" }}</h2>
          <ReviewForm
            v-if="editing"
            :key="`edit-${editing.id}`"
            :initial="editing"
            :busy="busyId === editing.id"
            submit-label="수정 완료"
            cancellable
            @submit="update"
            @cancel="editing = null"
          />
          <ReviewForm v-else ref="formRef" :busy="busy" @submit="create" />
          <p v-if="notice" class="notice">{{ notice }}</p>
          <p class="muted small">로그인 없이 작성됩니다. 같은 브라우저에서만 내 후기를 수정하거나 삭제할 수 있습니다.</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head">
          <h2>후기 {{ reviews.length }}개</h2>
          <select v-model="sort">
            <option value="recent">최신순</option>
            <option value="rating">별점순</option>
          </select>
        </div>
        <p v-if="!reviews.length" class="muted">첫 후기를 남겨 보세요.</p>
        <ReviewList v-else :reviews="reviews" :busy-id="busyId" @edit="editing = $event" @remove="remove" />
      </section>
    </template>
  </div>
</template>
