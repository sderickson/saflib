<template>
  <div>
    <h1 class="text-h6 mb-2">Unexpected response</h1>
    <template v-if="result instanceof UnhandledResponse">
      <p class="text-body-2 text-medium-emphasis mb-2">
        HTTP status: <code>{{ result.status }}</code>
      </p>
      <pre
        class="text-body-2 pa-4 rounded bg-surface-variant overflow-auto"
        style="white-space: pre-wrap; word-break: break-word"
      >{{ bodyJson }}</pre>
    </template>
    <p v-else-if="className" class="text-body-2">
      Unhandled Response: {{ className }}
    </p>
    <pre
      v-else
      class="text-body-2 pa-4 rounded bg-surface-variant overflow-auto"
      style="white-space: pre-wrap; word-break: break-word"
    >{{ fallbackJson }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { UnhandledResponse } from "@saflib/ory-kratos-sdk";

const props = defineProps<{
  result: unknown;
}>();

const bodyJson = computed(() => {
  if (!(props.result instanceof UnhandledResponse)) return "";
  try {
    return JSON.stringify(props.result.data, null, 2);
  } catch {
    return String(props.result.data);
  }
});

const className = computed(() => {
  if (props.result instanceof UnhandledResponse) return null;
  const r = props.result;
  if (r === null || typeof r !== "object") return null;
  if (Array.isArray(r)) return null;
  if (Object.getPrototypeOf(r) === Object.prototype) return null;
  const name = (r as object).constructor?.name;
  return name && name !== "Object" ? name : null;
});

const fallbackJson = computed(() => {
  try {
    return JSON.stringify(props.result, null, 2);
  } catch {
    return String(props.result);
  }
});
</script>
