<template>
  <!-- With somewhere to go (configureIdLinks), hovering offers the links;
       otherwise the full id. Clicking always copies. -->
  <v-menu v-if="links.length" open-on-hover :open-delay="250" location="bottom start" max-width="320">
    <template #activator="{ props: menuProps }">
      <button
        v-bind="menuProps"
        type="button"
        class="short-id short-id--linked text-no-wrap"
        :aria-label="`${strings.copy} ${id}`"
        data-test="short-id"
        @click.stop="copy"
      >
        <span class="short-id__dot" :style="{ background: color }" aria-hidden="true" />
        <span class="short-id__text">{{ label }}</span>
      </button>
    </template>
    <v-card class="pa-2" data-test="short-id-menu">
      <div class="d-flex align-center ga-2 px-2 pb-1">
        <code class="short-id__full">{{ id }}</code>
        <v-spacer />
        <v-btn size="x-small" variant="text" @click="copy">{{ copied ? strings.copied : strings.copy }}</v-btn>
      </div>
      <v-list density="compact" class="py-0" bg-color="transparent">
        <v-list-item v-for="l in links" :key="l.label" :to="l.to" :title="l.label" data-test="short-id-link" />
      </v-list>
    </v-card>
  </v-menu>
  <v-tooltip v-else location="top" :text="copied ? strings.copied : id">
    <template #activator="{ props: tooltipProps }">
      <button
        v-bind="tooltipProps"
        type="button"
        class="short-id text-no-wrap"
        :aria-label="`${strings.copy} ${id}`"
        data-test="short-id"
        @click.stop="copy"
      >
        <span class="short-id__dot" :style="{ background: color }" aria-hidden="true" />
        <span class="short-id__text">{{ label }}</span>
      </button>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { idColor, shortId } from "../src/id-color.ts";
import { idLinksFor } from "../src/id-links.ts";

const props = defineProps<{
  /** The full id. Hover shows it; click copies it. */
  id: string;
  /** Type prefix: r request, j job, m matter, i issue, o org, u user, p process. */
  prefix?: string;
}>();

const emit = defineEmits<{ copied: [id: string] }>();

const strings = { copy: "Copy", copied: "Copied" };

const label = computed(() => shortId(props.id, props.prefix));
const links = computed(() => idLinksFor(props.prefix, props.id));
const color = computed(() => idColor(props.id));

const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.id);
  } catch {
    return;
  }
  copied.value = true;
  emit("copied", props.id);
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => (copied.value = false), 1200);
}
</script>

<style scoped>
.short-id {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  cursor: pointer;
}
.short-id:hover,
.short-id:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.short-id--linked .short-id__text {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}
.short-id__full {
  font-size: 0.75rem;
  word-break: break-all;
}
.short-id__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}
</style>
