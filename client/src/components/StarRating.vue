<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(defineProps<{ modelValue: number; editable?: boolean; size?: number }>(), { editable: false, size: 18 });
const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const hover = ref(0);
const shown = computed(() => (props.editable && hover.value ? hover.value : props.modelValue));
const width = computed(() => `${(Math.max(0, Math.min(5, shown.value)) / 5) * 100}%`);

function pick(n: number) {
  if (props.editable) emit("update:modelValue", n);
}
</script>

<template>
  <span
    class="stars"
    :class="{ 'stars--editable': editable }"
    :style="{ fontSize: `${size}px` }"
    :aria-label="`별점 ${modelValue}`"
    @mouseleave="hover = 0"
  >
    <span class="stars__base" aria-hidden="true">★★★★★</span>
    <span class="stars__fill" :style="{ width }" aria-hidden="true">★★★★★</span>
    <span v-if="editable" class="stars__hit">
      <button v-for="n in 5" :key="n" type="button" :aria-label="`${n}점`" @mouseenter="hover = n" @click="pick(n)"></button>
    </span>
  </span>
</template>
