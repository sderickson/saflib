<template>
  <v-app>
    <v-app-bar height="90" class="px-4" v-if="mounted">
      <!-- Logo -->
      <v-app-bar-title>
        <a :href="toHref(rootHomeLink)" class="logo-link">
          {{ __product_name___layout.nav_title }}
        </a>
      </v-app-bar-title>

      <!-- Desktop Navigation Links (hidden on mobile) -->
      <v-toolbar-items class="d-none d-md-block">
        <v-btn
          v-for="link in links"
          :key="link.path"
          variant="text"
          class="text-uppercase font-weight-regular"
          :href="toHref(link)"
        >
          {{ link.name }}
        </v-btn>
      </v-toolbar-items>

      <!-- Mobile Menu Button (hidden on desktop) -->
      <template #append>
        <slot name="app-bar-append" />
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
        :href="toHref(link)"
      />
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { __product_name___layout } from "./__ProductName__Layout.strings.ts";
import { linkToHrefWithHost, type Link, type LinkOptions } from "@saflib/links";

// import other subdomain links here as needed
// import { __subdomainName__Links } from "template-package-links";

// Use this for choosing what links to display
// import { getProfile } from "@saflib/auth";
// import { useQuery } from "@tanstack/vue-query";
// const { data: profile } = useQuery(getProfile());
// const isAdmin = computed(() => profile.value?.isAdmin ?? false);

const props = defineProps<{
  loggedIn?: boolean;
}>();

const drawer = ref(false);

// Forces a re-render after SSG hydration so links recompute with the real domain.
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const rootHomeLink: Link = { subdomain: "root", path: "/" };

const toHref = (link: Link, options?: LinkOptions) => {
  void mounted.value;
  return linkToHrefWithHost(link, options);
};

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
