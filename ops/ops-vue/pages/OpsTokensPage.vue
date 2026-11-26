<template>
  <ContentWidth variant="full">
    <div class="d-flex align-center mb-2">
      <AdminPageTitle>{{ strings.title }}</AdminPageTitle>
      <v-spacer />
      <v-btn color="primary" data-test="create-token" @click="openCreate">
        {{ strings.create }}
      </v-btn>
    </div>

    <v-chip-group
      v-if="tokens.length > 0"
      v-model="filter"
      mandatory
      selected-class="text-primary"
      class="mb-2"
    >
      <v-chip value="active" size="small" variant="outlined" data-test="filter-active">
        {{ strings.filterActive }} ({{ activeCount }})
      </v-chip>
      <v-chip value="all" size="small" variant="outlined" data-test="filter-all">
        {{ strings.filterAll }} ({{ tokens.length }})
      </v-chip>
    </v-chip-group>

    <v-data-table
      v-if="tokens.length > 0"
      :headers="headers"
      :items="visibleTokens"
      item-value="id"
      class="elevation-1"
    >
      <template #[`item.name`]="{ item }">
        {{ item.name }}
        <v-chip v-if="stateOf(item) !== 'active'" :color="stateColor(item)" size="x-small" class="ml-1" data-test="token-state">
          {{ stateLabel(item) }}
        </v-chip>
        <v-chip
          v-if="item.exchanged_from"
          size="x-small"
          variant="outlined"
          class="ml-1"
          :title="strings.exchangedHint"
          data-test="token-exchanged"
        >
          {{ strings.exchanged }}
        </v-chip>
      </template>
      <template #[`item.lifetime`]="{ item }">
        <span class="d-inline-flex align-center ga-1 text-no-wrap" :title="strings.lifetimeHint" data-test="token-lifetime">
          <v-icon v-if="!item.expires_at" icon="mdi-infinity" size="18" :aria-label="strings.noExpiry" />
          <template v-else>{{ tokenLifetime(item.created_at, item.expires_at) }}</template>
        </span>
      </template>
      <template #[`item.scopes`]="{ item }">
        <v-chip v-for="scope in item.scopes" :key="scope" size="small" class="mr-1">
          {{ scope }}
        </v-chip>
      </template>
      <template #[`item.last_used_at`]="{ item }">
        {{ item.last_used_at ? formatShortDateTime(item.last_used_at) : strings.never }}
      </template>
      <template #[`item.expires_at`]="{ item }">
        {{ item.expires_at ? formatShortDateTime(item.expires_at) : strings.never }}
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn
          v-if="stateOf(item) === 'active'"
          size="small"
          color="error"
          variant="text"
          :loading="revokingId === item.id"
          :disabled="revokingId !== null"
          @click="revoke(item.id)"
        >
          {{ strings.revoke }}
        </v-btn>
      </template>
      <template #no-data>{{ strings.noActive }}</template>
      <template #bottom></template>
    </v-data-table>
    <p v-else class="saf-admin-empty">{{ strings.empty }}</p>

    <v-dialog v-model="createOpen" max-width="560">
      <v-card v-if="!createdSecret">
        <v-card-title>{{ strings.createTitle }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            :label="strings.nameLabel"
            :hint="strings.nameHint"
            persistent-hint
            maxlength="100"
            data-test="token-name"
          />
          <v-select
            v-model="form.scopes"
            :items="scopeOptions"
            :label="strings.scopesLabel"
            multiple
            chips
            class="mt-4"
          />
          <v-text-field
            v-model="form.expiresInDays"
            :label="strings.expiresLabel"
            type="number"
            min="1"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="createOpen = false">{{ strings.cancel }}</v-btn>
          <v-btn
            color="primary"
            :disabled="!canSubmit"
            :loading="createMutation.isPending.value"
            data-test="submit-token"
            @click="submit"
          >
            {{ strings.submit }}
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-card v-else>
        <v-card-title>{{ strings.secretTitle }}</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            {{ strings.secretWarning }}
          </v-alert>
          <code class="d-block pa-2 bg-grey-lighten-4" data-test="token-secret">{{
            createdSecret
          }}</code>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" data-test="secret-done" @click="closeSecret">
            {{ strings.done }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { AdminPageTitle, ContentWidth } from "@saflib/vue/components";
import { formatShortDateTime } from "@saflib/vue";
import type { OpsTokenResponse } from "@saflib/ops-spec";
import { useOpsTokensPageLoader } from "./OpsTokens.loader.ts";
import { ops_tokens as strings } from "./OpsTokens.strings.ts";

type Scope = OpsTokenResponse["scopes"][number];
const scopeOptions: Scope[] = ["ops:read", "ops:triage", "ops:alerts-ingest", "ops:exchange"];

const wide = { headerProps: { class: "saf-admin-hide-xs" }, cellProps: { class: "saf-admin-hide-xs" } };
const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Scopes", key: "scopes", sortable: false, ...wide },
  { title: "Lifetime", key: "lifetime", sortable: false },
  { title: "Last used", key: "last_used_at", sortable: true },
  { title: "Expires", key: "expires_at", sortable: true, ...wide },
  { title: "", key: "actions", sortable: false, align: "end" as const },
];

const { tokensQuery, createMutation, revokeMutation } = useOpsTokensPageLoader();
const tokens = computed(() => tokensQuery.data.value?.ops_tokens ?? []);

// Expired and revoked tokens (most of them short-lived exchanged ones) pile up
// fast, so only active ones show until the admin asks for all.
const filter = ref<"active" | "all">("active");
const activeCount = computed(() => tokens.value.filter((t) => stateOf(t) === "active").length);
const visibleTokens = computed(() =>
  filter.value === "all" ? tokens.value : tokens.value.filter((t) => stateOf(t) === "active"),
);

function stateOf(t: OpsTokenResponse): "active" | "revoked" | "expired" {
  if (t.revoked_at) return "revoked";
  if (t.expires_at && new Date(t.expires_at) <= new Date()) return "expired";
  return "active";
}
const stateLabel = (t: OpsTokenResponse) => strings[stateOf(t)];
const stateColor = (t: OpsTokenResponse) =>
  ({ active: "success", revoked: "error", expired: "grey" })[stateOf(t)];

// How long a token was issued for: "8h", "30d", "1y" (no expiry shows ∞).
const tokenLifetime = (createdAt: string, expiresAt: string): string => {
  const hours = (new Date(expiresAt).getTime() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)}d`;
  return `${Math.round(days / 365)}y`;
};

// Create
const createOpen = ref(false);
const createdSecret = ref<string | null>(null);
const form = reactive<{ name: string; scopes: Scope[]; expiresInDays: string }>({
  name: "",
  scopes: ["ops:read"],
  expiresInDays: "",
});
const canSubmit = computed(() => form.name.trim().length > 0 && form.scopes.length > 0);

function openCreate() {
  form.name = "";
  form.scopes = ["ops:read"];
  form.expiresInDays = "";
  createdSecret.value = null;
  createOpen.value = true;
}

function submit() {
  const days = Number(form.expiresInDays);
  createMutation.mutate(
    {
      name: form.name.trim(),
      scopes: form.scopes,
      expires_at: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    },
    {
      onSuccess: (data) => {
        createdSecret.value = data.token;
      },
    },
  );
}

function closeSecret() {
  // Drop the secret from memory as soon as the admin is done with it.
  createdSecret.value = null;
  createOpen.value = false;
}

// Revoke
const revokingId = ref<string | null>(null);
function revoke(id: string) {
  if (!window.confirm(strings.revokeConfirm)) return;
  revokingId.value = id;
  revokeMutation.mutate({ id }, { onSettled: () => (revokingId.value = null) });
}
</script>
