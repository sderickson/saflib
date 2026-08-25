<template>
  <ContentWidth>
    <div class="mb-6">
      <h1 class="text-h4 mb-2">{{ t(home.title) }}</h1>
      <p class="text-body-1 text-medium-emphasis mb-0">
        {{ t(home.subtitle) }}
      </p>
    </div>

    <v-select
      v-if="mdAndDown"
      class="mb-4"
      :model-value="activeNavId"
      :items="selectItems"
      item-title="title"
      item-value="id"
      hide-details
      density="comfortable"
      variant="outlined"
      :aria-label="t(home_nav_list.section_nav_aria_label)"
      data-testid="account-home-nav-select"
      @update:model-value="onNavSelect"
    />

    <div class="d-flex ga-4 align-start">
      <v-sheet
        v-if="lgAndUp"
        class="flex-shrink-0 pa-2"
        width="220"
        rounded
        border
      >
        <HomeNavList :items="navItems" />
      </v-sheet>

      <v-sheet class="flex-grow-1 pa-4" rounded border style="min-width: 0">
        <router-view />
      </v-sheet>
    </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { ContentWidth } from "@saflib/vue/components";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import {
  buildAccountHomeNavItems,
  resolveAccountHomeNavActiveId,
  type AccountHomeNavItemId,
} from "./Home.logic.ts";
import { home } from "./Home.strings.ts";
import { home_nav_list } from "./HomeNavList.strings.ts";
import HomeNavList from "./HomeNavList.vue";

const { t } = useReverseT();
const route = useRoute();
const router = useRouter();
const { mdAndDown, lgAndUp } = useDisplay();

const navItems = computed(() => buildAccountHomeNavItems());

const titleById: Record<AccountHomeNavItemId, string> = {
  profile: home_nav_list.profile_link,
  email: home_nav_list.email_link,
  password: home_nav_list.password_link,
  mfa: home_nav_list.mfa_link,
  sessions: home_nav_list.sessions_link,
};

const selectItems = computed(() =>
  navItems.value.map((item) => ({
    id: item.id,
    title: t(titleById[item.id]),
  })),
);

const activeNavId = computed(
  () =>
    resolveAccountHomeNavActiveId(route.path, navItems.value) ??
    navItems.value[0]?.id,
);

function onNavSelect(value: unknown): void {
  if (typeof value !== "string") {
    return;
  }
  const item = navItems.value.find((entry) => entry.id === value);
  if (!item) {
    return;
  }
  const { to, href } = item.linkProps;
  if (typeof href === "string" && href.length > 0) {
    window.location.assign(href);
    return;
  }
  if (typeof to === "string" && to !== route.path) {
    void router.push(to);
  }
}
</script>
