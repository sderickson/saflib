<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-1">{{ strings.title }}</h1>

    <div class="users-split" :class="{ 'users-split--stacked': stacked }">
      <section v-show="showList" class="users-list" :aria-label="strings.title">
        <v-text-field
          v-model="search"
          :label="strings.search"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="mb-3"
          data-test="users-search"
        />

        <v-card>
          <v-progress-linear v-if="listQuery.isFetching.value" indeterminate absolute />
          <v-alert v-if="listQuery.error.value" type="error" variant="tonal" class="ma-3">
            {{ listQuery.error.value.message }}
          </v-alert>
          <v-table density="compact" class="users-table" hover>
            <thead>
              <tr>
                <th>{{ strings.columns.user }}</th>
                <template v-if="wideColumns">
                  <th class="saf-admin-hide-xs">{{ strings.columns.org }}</th>
                  <th class="text-no-wrap">{{ strings.columns.last_sign_in }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in users"
                :key="u.id"
                :class="{ 'users-row--selected': u.id === selectedId }"
                class="users-row"
                tabindex="0"
                :aria-selected="u.id === selectedId"
                data-test="users-row"
                @click="select(u.id)"
                @keydown.enter="select(u.id)"
              >
                <td class="py-2"><UserRef :id="u.id" variant="full" /></td>
                <template v-if="wideColumns">
                  <td class="text-body-2 saf-admin-hide-xs">{{ u.org ?? strings.none }}</td>
                  <td class="text-body-2 text-no-wrap">{{ formatRelative(u.last_sign_in_at) }}</td>
                </template>
              </tr>
              <tr v-if="listQuery.isSuccess.value && users.length === 0">
                <td :colspan="wideColumns ? 3 : 1" class="text-body-2 text-medium-emphasis py-4">
                  {{ strings.empty }}
                </td>
              </tr>
            </tbody>
          </v-table>
          <div class="d-flex align-center pa-3 ga-3">
            <span class="text-caption text-medium-emphasis">{{ strings.matching(total) }}</span>
            <v-spacer />
            <v-btn
              v-if="listQuery.hasNextPage.value"
              variant="text"
              :loading="listQuery.isFetchingNextPage.value"
              @click="listQuery.fetchNextPage()"
            >
              {{ strings.load_more }}
            </v-btn>
          </div>
        </v-card>
      </section>

      <UserDetailPanel
        v-if="selectedId"
        :id="selectedId"
        class="users-detail"
        @close="select(null)"
      />
    </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { ContentWidth } from "@saflib/vue/components";
import UserRef from "../../components/UserRef.vue";
import UserDetailPanel from "./UserDetailPanel.vue";
import { useListIdentities } from "../../requests/identities.ts";
import { formatRelative } from "../../lib/users-page.ts";
import { users_page as strings } from "./Users.strings.ts";

const route = useRoute();
const router = useRouter();
const { lgAndUp, mdAndUp } = useDisplay();

const queryParam = (name: string) => {
  const raw = route.query[name];
  return typeof raw === "string" ? raw : "";
};

// The search box updates the URL after a pause; the list follows the URL.
const search = ref(queryParam("q"));
const q = computed(() => queryParam("q"));
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const next = (value ?? "").trim();
    if (next === q.value) return;
    router.replace({ query: { ...route.query, q: next || undefined } });
  }, 250);
});

const selectedId = computed(() => queryParam("id") || null);
function select(id: string | null) {
  router.replace({ query: { ...route.query, id: id ?? undefined } });
}

const listQuery = useListIdentities(q);
const users = computed(() => listQuery.data.value?.pages.flatMap((p) => p.identities) ?? []);
const total = computed(() => listQuery.data.value?.pages[0]?.total ?? 0);

// Wide: list and panel side by side. Medium with a selection: the list keeps
// only the User column. Narrow with a selection: the panel replaces the list.
const stacked = computed(() => !mdAndUp.value);
const showList = computed(() => mdAndUp.value || !selectedId.value);
const wideColumns = computed(() => lgAndUp.value || !selectedId.value);
</script>

<style scoped>
.users-split {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}
.users-split--stacked {
  flex-direction: column;
  align-items: stretch;
}
.users-list {
  flex: 1 1 520px;
  min-width: 0;
}
.users-detail {
  flex: 0 0 360px;
  max-width: 100%;
  position: sticky;
  top: 64px;
}
.users-split--stacked .users-detail {
  flex-basis: auto;
  position: static;
}
.users-row {
  cursor: pointer;
}
.users-row--selected {
  background: rgba(var(--v-theme-secondary), 0.16);
}
</style>
