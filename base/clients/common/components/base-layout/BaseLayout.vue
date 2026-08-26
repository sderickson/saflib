<template>
  <v-app>
    <v-app-bar height="90" class="px-4" v-if="mounted">
      <v-app-bar-title>
        <a :href="toHref(logoLink)" class="logo-link">
          {{ t(base_layout.nav_title) }}
        </a>
      </v-app-bar-title>

      <v-toolbar-items class="d-none d-md-block">
        <v-btn
          v-for="link in navLinks"
          :key="link.path"
          variant="text"
          class="text-uppercase font-weight-regular"
          :href="toHref(link)"
        >
          {{ link.name }}
        </v-btn>
      </v-toolbar-items>

      <template #append>
        <slot name="app-bar-append" />
        <v-app-bar-nav-icon
          class="d-md-none mr-4"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <v-icon v-if="!mobileNavOpen">mdi-menu</v-icon>
          <v-icon v-else>mdi-close</v-icon>
        </v-app-bar-nav-icon>
      </template>
    </v-app-bar>

    <v-navigation-drawer
      v-model="mobileNavOpen"
      disable-resize-watcher
      location="top"
      :width="mobileNavOpen ? '285' : '0'"
    >
      <v-list-item
        v-for="link in navLinks"
        :key="link.name"
        :title="link.name"
        class="text-uppercase text-center py-4"
        :href="toHref(link)"
      />
    </v-navigation-drawer>

    <v-navigation-drawer v-if="hasSidebar" permanent width="200">
      <v-list nav>
        <v-list-item
          v-for="link in sidebarLinks"
          :key="link.path"
          :href="toHref(link)"
          :title="link.name"
          variant="text"
        />
        <template v-if="devSidebarLinks && devSidebarLinks.length > 0">
          <v-divider class="my-2" />
          <v-list-subheader>{{ t(base_layout.dev_sidebar_title) }}</v-list-subheader>
          <v-list-item
            v-for="link in devSidebarLinks"
            :key="link.path"
            :href="toHref(link)"
            :title="link.name"
            variant="text"
          />
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { base_layout } from "./BaseLayout.strings.ts";
import {
  linkToHrefWithHost,
  navigateToLink,
  type Link,
  type LinkOptions,
} from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { accountLinks, adminLinks, appLinks } from "@saflib/base-links";
import { useSiteAdmin } from "../../composables/useSiteAdmin.ts";
import { useReverseT } from "../../i18n.ts";

type SidebarLink = Link & { name: string };

const props = defineProps<{
  /** When true, redirect to login with `return_to` if the session resolves unauthenticated. */
  requireAuth?: boolean;
  sidebarLinks?: SidebarLink[];
  /** Development-only observability links (Loki, Prometheus, etc. in production). */
  devSidebarLinks?: SidebarLink[];
}>();

const hasSidebar = computed(
  () =>
    (props.sidebarLinks?.length ?? 0) > 0 ||
    (props.devSidebarLinks?.length ?? 0) > 0,
);

const { t } = useReverseT();
const { data: session, status: sessionStatus } = useKratosSession();
const { isSiteAdmin } = useSiteAdmin();

const isLoggedIn = computed(() => !!session.value);

watch(
  () =>
    [props.requireAuth, sessionStatus.value, session.value] as [
      boolean | undefined,
      typeof sessionStatus.value,
      typeof session.value,
    ],
  ([requireAuth, status, sess]) => {
    if (typeof window === "undefined") return;
    if (!requireAuth || status !== "success") return;
    if (sess) return;
    navigateToLink(authLinks.newLogin, {
      params: { return_to: window.location.href },
    });
  },
  { immediate: true },
);

const mobileNavOpen = ref(false);

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const toHref = (link: Link, options?: LinkOptions) => {
  void mounted.value;
  return linkToHrefWithHost(link, options);
};

type LinkWithName = Link & { name: string };

const logoLink = computed<Link>(() =>
  isLoggedIn.value ? appLinks.home : { subdomain: "root", path: "/" },
);

const navLinks = computed<LinkWithName[]>(() => {
  if (!isLoggedIn.value) {
    return [
      { ...authLinks.newLogin, name: t(base_layout.nav_login) },
      { ...authLinks.newRegistration, name: t(base_layout.nav_sign_up) },
    ];
  }

  const links: LinkWithName[] = [
    { ...appLinks.home, name: t(base_layout.nav_app) },
    { ...accountLinks.home, name: t(base_layout.nav_account) },
  ];

  if (isSiteAdmin.value) {
    links.push({ ...adminLinks.home, name: t(base_layout.nav_admin) });
  }

  links.push({ ...authLinks.logout, name: t(base_layout.nav_logout) });
  return links;
});
</script>
