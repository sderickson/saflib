<template>
  <div ref="rootEl" class="rsplit">
    <div
      class="rsplit__col rsplit__col--left"
      :style="{ flex: `0 0 ${leftWidth}px` }"
    >
      <slot name="left" />
    </div>
    <div
      class="rsplit__handle"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="leftWidth"
      tabindex="0"
      @mousedown.prevent="onDragStart"
      @keydown="onHandleKey"
    />
    <div class="rsplit__col rsplit__col--right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    /** localStorage key for persisted left width (px). */
    storageKey?: string;
    defaultLeft?: number;
    minLeft?: number;
    maxLeft?: number;
  }>(),
  {
    defaultLeft: 220,
    minLeft: 140,
    maxLeft: 480,
  },
);

const rootEl = ref<HTMLElement | null>(null);
const leftWidth = ref(props.defaultLeft);

function clamp(n: number): number {
  const root = rootEl.value;
  const maxFromRoot = root
    ? Math.max(props.minLeft, root.clientWidth - 200)
    : props.maxLeft;
  const max = Math.min(props.maxLeft, maxFromRoot);
  return Math.min(max, Math.max(props.minLeft, n));
}

function loadStored() {
  if (!props.storageKey || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(props.storageKey);
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n)) leftWidth.value = clamp(n);
  } catch {
    /* ignore */
  }
}

function persist() {
  if (!props.storageKey || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(props.storageKey, String(leftWidth.value));
  } catch {
    /* ignore */
  }
}

let dragging = false;

function onDragStart(ev: MouseEvent) {
  dragging = true;
  const startX = ev.clientX;
  const startW = leftWidth.value;

  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    leftWidth.value = clamp(startW + (e.clientX - startX));
  };
  const onUp = () => {
    dragging = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    persist();
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function onHandleKey(ev: KeyboardEvent) {
  const step = ev.shiftKey ? 32 : 12;
  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    leftWidth.value = clamp(leftWidth.value - step);
    persist();
  } else if (ev.key === "ArrowRight") {
    ev.preventDefault();
    leftWidth.value = clamp(leftWidth.value + step);
    persist();
  }
}

onMounted(() => {
  loadStored();
  leftWidth.value = clamp(leftWidth.value);
});

onBeforeUnmount(() => {
  dragging = false;
});
</script>

<style scoped>
.rsplit {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.rsplit__col {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.rsplit__col--right {
  flex: 1 1 auto;
}
.rsplit__handle {
  flex: 0 0 5px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 1;
}
.rsplit__handle::after {
  content: "";
  position: absolute;
  inset: 0 1px;
  background: rgba(var(--v-theme-on-surface), 0.12);
}
.rsplit__handle:hover::after,
.rsplit__handle:focus-visible::after {
  background: rgba(var(--v-theme-primary), 0.55);
}
</style>
