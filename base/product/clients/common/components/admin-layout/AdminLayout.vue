<template>
  <v-app>
    <v-app-bar density="compact" class="px-2" v-if="mounted">
      <v-app-bar-nav-icon
        v-if="!mdAndUp"
        :aria-label="admin_layout.open_nav"
        @click="drawerOpen = !drawerOpen"
      />
      <v-btn
        variant="text"
        prepend-icon="mdi-chevron-left"
        :href="linkToHrefWithHost(appLinks.home)"
      >
        {{ admin_layout.back_to_app }}
      </v-btn>
      <v-divider vertical inset class="mx-2" />
      <span class="text-subtitle-1 font-weight-medium">{{ base_layout.nav_title }}</span>
      <span class="text-subtitle-1 text-medium-emphasis ms-2">{{ admin_layout.admin }}</span>

      <template #append>
        <div class="d-flex align-center ga-2">
          <!-- Health pill and traffic chip land here. -->
          <slot name="chips" />
          <BuildChip v-if="mdAndUp" :repos="repos" />
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon
                variant="text"
                size="small"
                :aria-label="admin_layout.account_menu"
              >
                <v-avatar size="32" color="secondary">{{ initials }}</v-avatar>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                :title="admin_layout.account"
                :href="linkToHrefWithHost(accountLinks.home)"
              />
              <v-list-item
                :title="admin_layout.logout"
                :href="linkToHrefWithHost(authLinks.logout)"
              />
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawerOpen"
      :permanent="mdAndUp"
      :temporary="!mdAndUp"
      width="232"
      color="surface"
    >
      <nav :aria-label="admin_layout.nav_label">
        <v-list nav density="compact">
          <template v-for="(group, gi) in visibleGroups" :key="group.label ?? gi">
            <v-list-subheader v-if="group.label" class="text-uppercase admin-nav-subheader mt-3">
              {{ group.label }}
              <v-chip v-if="group.tag" size="x-small" variant="tonal" class="ms-2">
                {{ group.tag }}
              </v-chip>
            </v-list-subheader>
            <v-list-item
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              :exact="item.path === '/'"
              :title="item.name"
              color="primary"
              rounded="lg"
              min-height="32"
              class="admin-nav-item"
            >
              <template v-if="item.badge" #append>
                <v-chip size="x-small" variant="tonal" :color="item.badgeColor ?? 'primary'">
                  {{ item.badge }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </nav>
    </v-navigation-drawer>

    <v-main>
      <!-- Shared admin look: defaults and styles for panels, tables, inputs. -->
      <AdminScope>
        <slot />
      </AdminScope>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { AdminScope } from "@saflib/vue/components";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { accountLinks, appLinks } from "@saflib/base-links";
import { BuildChip, type BuildRepoUrls } from "@saflib/ops-vue";
import { useRequireAuth } from "#composables/useRequireAuth.ts";
import { admin_layout } from "./AdminLayout.strings.ts";
import { base_layout } from "../base-layout/BaseLayout.strings.ts";
import { nonEmptyGroups, type AdminNavGroup } from "./admin-nav.ts";

const props = defineProps<{
  groups: AdminNavGroup[];
  /** Repo URLs for build commit links. */
  repos?: BuildRepoUrls;
}>();

const { session } = useRequireAuth(true);
const { mdAndUp } = useDisplay();

const drawerOpen = ref(mdAndUp.value);
watch(mdAndUp, (wide) => {
  drawerOpen.value = wide;
});

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const visibleGroups = computed(() => nonEmptyGroups(props.groups));

const initials = computed(() => {
  const traits = session.value?.identity?.traits as { email?: string; name?: string } | undefined;
  const source = traits?.name || traits?.email || "";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
});
</script>

<style scoped>
/* Vuetify's compact nav items are 40px plus a 4px gap; the admin list is
   long, so keep it tight enough for every group to fit on a laptop screen. */
.admin-nav-item {
  margin-bottom: 0 !important;
}
.admin-nav-subheader {
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  font-weight: 600;
}
</style>
