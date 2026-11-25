<template>
  <v-card variant="outlined" tag="aside" :aria-label="strings.detail.label" data-test="user-detail">
    <div class="d-flex align-start ga-3 pa-4">
      <v-avatar size="44" :style="{ background: tintColor }" class="detail-avatar" aria-hidden="true">
        {{ initials }}
      </v-avatar>
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-h6 text-truncate">{{ identity?.name ?? identity?.email ?? strings.none }}</div>
        <div v-if="identity?.name && identity.email" class="text-body-2 text-medium-emphasis text-truncate">
          {{ identity.email }}
        </div>
        <v-chip v-if="identity && identity.state !== 'active'" size="x-small" color="error" variant="tonal" class="mt-1">
          {{ strings.detail.inactive }}
        </v-chip>
      </div>
      <v-btn icon="mdi-close" variant="text" size="small" :aria-label="strings.detail.close" @click="emit('close')" />
    </div>
    <v-divider />

    <v-progress-linear v-if="query.isPending.value" indeterminate />
    <v-alert v-else-if="query.error.value" type="error" variant="tonal" class="ma-4">
      {{ strings.detail.load_error }} {{ query.error.value.message }}
    </v-alert>

    <template v-if="identity">
      <dl class="detail-grid pa-4">
        <dt>{{ strings.detail.id }}</dt>
        <dd class="d-flex align-center ga-2">
          <ShortId :id="id" prefix="u" />
          <v-btn size="x-small" variant="text" @click="copyId">
            {{ copied ? strings.detail.copied : strings.detail.copy_id }}
          </v-btn>
        </dd>
        <template v-if="identity.org">
          <dt>{{ strings.detail.org }}</dt>
          <dd>{{ identity.org }}</dd>
        </template>
        <template v-if="identity.role">
          <dt>{{ strings.detail.role }}</dt>
          <dd class="text-capitalize">{{ identity.role }}</dd>
        </template>
        <dt>{{ strings.detail.email }}</dt>
        <dd>
          <v-chip size="x-small" variant="tonal" :color="identity.verified ? 'success' : 'warning'">
            {{ identity.verified ? strings.detail.verified : strings.detail.unverified }}
          </v-chip>
        </dd>
        <dt>{{ strings.detail.mfa }}</dt>
        <dd>{{ mfaLabel }}</dd>
        <dt>{{ strings.detail.joined }}</dt>
        <dd>{{ formatDate(identity.created_at) }}</dd>
        <dt>{{ strings.detail.last_sign_in }}</dt>
        <dd>{{ formatRelative(identity.last_sign_in_at) }}</dd>
        <dt>{{ strings.detail.sessions }}</dt>
        <dd>{{ query.data.value?.active_sessions ?? 0 }}</dd>
      </dl>

      <template v-if="links.length > 0">
        <v-divider />
        <div class="pa-4">
          <div class="text-overline text-medium-emphasis mb-1">{{ strings.detail.activity }}</div>
          <div class="d-flex flex-column ga-1">
            <template v-for="l in links" :key="l.label">
              <router-link v-if="l.to" :to="l.to" class="text-body-2">{{ l.label }}</router-link>
              <a v-else :href="l.href" target="_blank" rel="noopener noreferrer" class="text-body-2">{{ l.label }}</a>
            </template>
          </div>
        </div>
      </template>
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ShortId } from "@saflib/vue/components";
import { idTint } from "@saflib/vue";
import { useGetIdentityAdmin } from "../../requests/identities.ts";
import { getUserLinks } from "../../lib/user-links.ts";
import { formatRelative, getUsersPageConfig, type UserPageLink } from "../../lib/users-page.ts";
import { initialsFor } from "../../lib/initials.ts";
import { users_page as strings } from "./Users.strings.ts";

const props = defineProps<{ id: string }>();
const emit = defineEmits<{ close: [] }>();

const query = useGetIdentityAdmin(() => props.id);
const identity = computed(() => query.data.value?.identity);

const tintColor = computed(() => idTint(props.id));
const initials = computed(() => initialsFor(identity.value?.name, identity.value?.email));

const mfaLabel = computed(() => {
  const methods = query.data.value?.mfa_methods ?? [];
  if (methods.length === 0) return strings.detail.mfa_none;
  return methods.map((m) => strings.mfa_methods[m] ?? m).join(", ");
});

const links = computed<UserPageLink[]>(() => {
  const l = getUserLinks();
  const own: UserPageLink[] = [
    ...(l.auditLog ? [{ label: "Audit log for this user", to: l.auditLog(props.id) }] : []),
    ...(l.serverLogs ? [{ label: "Server logs for this user", to: l.serverLogs(props.id) }] : []),
  ];
  const extra = identity.value ? (getUsersPageConfig().extraLinks?.(identity.value) ?? []) : [];
  return [...own, ...extra];
});

const copied = ref(false);
async function copyId() {
  try {
    await navigator.clipboard.writeText(props.id);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1200);
  } catch {
    // Clipboard blocked; the ShortId tooltip still shows the full id.
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
</script>

<style scoped>
.detail-avatar {
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.detail-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
  margin: 0;
  font-size: 0.875rem;
}
.detail-grid dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.detail-grid dd {
  margin: 0;
  min-width: 0;
}
</style>
