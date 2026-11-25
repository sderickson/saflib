<template>
  <!-- Ids that can't be a person (e.g. "system") render as a plain ShortId. -->
  <ShortId v-if="!isPerson" :id="id" prefix="u" />

  <span v-else-if="notFound" class="user-ref text-medium-emphasis" data-test="user-ref">
    <v-avatar :size="avatarSize" class="user-ref__avatar user-ref__avatar--gone" aria-hidden="true">
      <v-icon size="x-small" icon="mdi-account-outline" />
    </v-avatar>
    <span v-if="variant !== 'avatar'">{{ strings.deleted }}</span>
    <ShortId :id="id" prefix="u" />
  </span>

  <v-menu v-else open-on-hover :open-delay="300" location="bottom start" max-width="320">
    <template #activator="{ props: menuProps }">
      <span
        v-bind="menuProps"
        class="user-ref"
        :class="`user-ref--${variant}`"
        data-test="user-ref"
        tabindex="0"
        :aria-label="variant === 'avatar' ? displayName : undefined"
      >
        <v-avatar
          :size="avatarSize"
          class="user-ref__avatar"
          :style="{ background: tintColor }"
          aria-hidden="true"
        >
          {{ initials }}
        </v-avatar>
        <template v-if="variant !== 'avatar'">
          <!-- Loading, or the lookup failed: the ShortId still identifies them. -->
          <ShortId v-if="!identity" :id="id" prefix="u" />
          <span v-else class="user-ref__text">
            <span class="user-ref__name">{{ displayName }}</span>
            <span v-if="variant === 'full' && identity?.name && identity.email" class="user-ref__email">
              {{ identity.email }}
            </span>
          </span>
        </template>
      </span>
    </template>

    <v-card v-if="identity" variant="elevated" class="pa-3" data-test="user-ref-card">
      <div class="d-flex align-center ga-3">
        <v-avatar size="40" :style="{ background: tintColor }" aria-hidden="true">{{ initials }}</v-avatar>
        <div class="min-w-0">
          <div class="text-body-1 font-weight-medium">{{ identity.name ?? identity.email ?? id }}</div>
          <div v-if="identity.name && identity.email" class="text-body-2 text-medium-emphasis">
            {{ identity.email }}
          </div>
        </div>
      </div>
      <div class="d-flex flex-wrap ga-1 mt-3">
        <v-chip size="x-small" variant="tonal" :color="identity.verified ? 'success' : 'warning'">
          {{ identity.verified ? strings.verified : strings.unverified }}
        </v-chip>
        <v-chip v-if="identity.state !== 'active'" size="x-small" variant="tonal" color="error">
          {{ strings.inactive }}
        </v-chip>
        <v-chip size="x-small" variant="tonal">
          {{ strings.created }} {{ formatDate(identity.created_at) }}
        </v-chip>
      </div>
      <div class="d-flex align-center ga-2 mt-3">
        <ShortId :id="id" prefix="u" />
        <v-spacer />
        <router-link v-for="l in links" :key="l.label" :to="l.to" class="text-body-2">
          {{ l.label }}
        </router-link>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ShortId } from "@saflib/vue/components";
import { idTint } from "@saflib/vue";
import { useIdentity } from "../requests/identities.ts";
import { getUserLinks } from "../lib/user-links.ts";
import { initialsFor } from "../lib/initials.ts";
import { user_ref as strings } from "./UserRef.strings.ts";

const props = withDefaults(
  defineProps<{
    /** Kratos identity id. */
    id: string;
    /**
     * full: avatar, name and email (detail views).
     * compact: avatar and name on one line (tables).
     * avatar: avatar only; the hover card has the rest.
     */
    variant?: "full" | "compact" | "avatar";
  }>(),
  { variant: "compact" },
);

const { identity, isPerson, notFound } = useIdentity(() => props.id);

const avatarSize = computed(() => (props.variant === "full" ? 32 : 22));
const tintColor = computed(() => idTint(props.id));
const displayName = computed(
  () => identity.value?.name ?? identity.value?.email ?? props.id,
);
const initials = computed(() =>
  initialsFor(identity.value?.name, identity.value?.email),
);

const links = computed(() => {
  const l = getUserLinks();
  return [
    l.user && { label: strings.user_page, to: l.user(props.id) },
    l.auditLog && { label: strings.audit_log, to: l.auditLog(props.id) },
    l.serverLogs && { label: strings.server_logs, to: l.serverLogs(props.id) },
  ].filter((x): x is { label: string; to: string } => !!x);
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
</script>

<style scoped>
.user-ref {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}
.user-ref__avatar {
  flex: 0 0 auto;
  font-size: 0.625rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.user-ref--full .user-ref__avatar {
  font-size: 0.75rem;
}
.user-ref__avatar--gone {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.user-ref__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.user-ref__name,
.user-ref__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-ref__email {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
