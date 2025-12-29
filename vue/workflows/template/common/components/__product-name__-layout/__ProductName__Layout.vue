<template>
  <v-app>
    <!-- Events are rendered here for playwright tests to assert on -->
    <pre class="d-none" data-testid="events">{{ events }}</pre>

    <v-app-bar height="90" class="px-4" flat>
      <!-- Logo -->
      <v-app-bar-title>
        <SpaLink :link="{ subdomain: 'root', path: '/' }" class="logo-link">
          {{ t(__product_name___layout.nav_title) }}
        </SpaLink>
      </v-app-bar-title>

      <!-- Desktop Navigation Links (hidden on mobile) -->
      <v-toolbar-items class="d-none d-md-block">
        <v-btn
          v-for="link in links"
          :key="link.path"
          variant="text"
          class="text-uppercase font-weight-regular"
          :href="linkToHrefWithHost(link)"
        >
          {{ link.name }}
        </v-btn>
      </v-toolbar-items>

      <!-- Mobile Menu Button (hidden on desktop) -->
      <template #append>
        <v-app-bar-nav-icon class="d-md-none mr-4" @click="drawer = !drawer">
          <v-icon v-if="!drawer">mdi-menu</v-icon>
          <v-icon v-else>mdi-close</v-icon>
        </v-app-bar-nav-icon>
      </template>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      disable-resize-watcher
      location="top"
      :width="drawer ? '285' : '0'"
    >
      <v-list-item
        v-for="link in links"
        :key="link.name"
        :title="link.name"
        class="text-uppercase text-center py-4"
        :href="linkToHrefWithHost(link)"
      />
    </v-navigation-drawer>

    <v-main>
      <TopLevelContainer v-if="!disableContainer">
        <slot />
      </TopLevelContainer>
      <slot v-else />
    </v-main>

    <SnackbarQueue />
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { TopLevelContainer } from "@saflib/vue/components";
import { __product_name___layout } from "./__ProductName__Layout.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { linkToHrefWithHost, type Link } from "@saflib/links";
import { events } from "@saflib/vue";
import { SnackbarQueue } from "@saflib/vue/components";
import { SpaLink } from "@saflib/vue/components";

// import other subdomain links here as needed
import { __subdomainName__Links } from "template-package-links";

// Use this for choosing what links to display
// import { getProfile } from "@saflib/auth";
// import { useQuery } from "@tanstack/vue-query";
// const { data: profile } = useQuery(getProfile());
// const isAdmin = computed(() => profile.value?.isAdmin ?? false);

const props = defineProps<{
  loggedIn?: boolean;
}>();

const { t } = useReverseT();

const route = useRoute();
const disableContainer = computed(() => {
  return route.meta?.disableContainer ?? false;
});

const drawer = ref(false);

type LinkWithName = Link & { name: string };

const links = computed<LinkWithName[]>(() => {
  return props.loggedIn
    ? [
        // Add links here for when logged in
        // Example:
        // { ...appLinks.home, name: "App" },
        // { ...accountLinks.home, name: "Account" },
        // { ...authLinks.logout, name: "Logout" },
        // ...(isAdmin.value ? [{ ...adminLinks.home, name: "Admin" }] : []),
      ]
    : [
        // Add links here for when not logged in
        // Example:
        // { ...authLinks.login, name: "Login" },
        // { ...authLinks.register, name: "Sign Up" },
      ];
});
</script>
