<template>
  <v-list class="pa-0 bg-transparent" density="compact" nav>
    <v-list-item
      v-for="item in items"
      :key="item.id"
      :title="t(titleForItem(item.id))"
      rounded="lg"
      v-bind="item.linkProps"
    />
  </v-list>
</template>

<script setup lang="ts">
import type { AccountHomeNavItem, AccountHomeNavItemId } from "./Home.logic.ts";
import { home_nav_list as strings } from "./HomeNavList.strings.ts";
import { useReverseT } from "@saflib/base-account-spa/i18n";

defineProps<{
  items: AccountHomeNavItem[];
}>();

const { t } = useReverseT();

const titleById: Record<AccountHomeNavItemId, string> = {
  profile: strings.profile_link,
  email: strings.email_link,
  password: strings.password_link,
  mfa: strings.mfa_link,
  sessions: strings.sessions_link,
};

function titleForItem(id: AccountHomeNavItemId): string {
  return titleById[id];
}
</script>
