<template>
  <ContentWidth>
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      {{ t(strings.description) }}
    </p>

    <v-form class="mb-8" @submit.prevent="onSubmit">
      <div class="d-flex flex-wrap ga-3 align-end">
        <v-text-field
          v-model="draftId"
          :label="t(strings.id_label)"
          density="comfortable"
          hide-details="auto"
          class="flex-grow-1"
          style="max-width: 36rem"
          autocomplete="off"
        />
        <v-btn type="submit" color="primary" variant="flat">
          {{ t(strings.submit) }}
        </v-btn>
      </div>
    </v-form>

    <template v-if="!userIdFromRoute">
      <p class="text-body-2 text-medium-emphasis">
        {{ t(strings.no_query) }}
      </p>
    </template>
    <template v-else>
      <h2 class="text-h6 mb-2">{{ t(strings.raw_json) }}</h2>
      <pre class="pa-4 rounded bg-surface-variant text-body-2 overflow-auto">{{
        formattedUser
      }}</pre>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ContentWidth } from "@saflib/vue/components";
import { users as strings } from "./Users.strings.ts";
import { useUsersLoader } from "./Users.loader.ts";
import { useReverseT } from "@saflib/base-admin-spa/i18n";

const { t } = useReverseT();
const route = useRoute();
const router = useRouter();

const { userQuery } = useUsersLoader();

const draftId = ref("");
const userIdFromRoute = computed(() => {
  const raw = route.query.id;
  return typeof raw === "string" && raw.length > 0 ? raw : "";
});

watch(
  userIdFromRoute,
  (id) => {
    draftId.value = id;
  },
  { immediate: true },
);

const formattedUser = computed(() => {
  const data = userQuery.data.value;
  if (data === undefined) {
    return "";
  }
  return JSON.stringify(data, null, 2);
});

function onSubmit() {
  const trimmed = draftId.value.trim();
  router.push({ path: route.path, query: trimmed ? { id: trimmed } : {} });
}
</script>
