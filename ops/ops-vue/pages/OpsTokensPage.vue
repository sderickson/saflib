<template>
  <ContentWidth variant="full">
    <div class="d-flex align-center mb-2">
      <h1 class="text-h4">{{ strings.title }}</h1>
      <v-spacer />
      <v-btn color="primary" data-test="create-token" @click="openCreate">
        {{ strings.create }}
      </v-btn>
    </div>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <v-data-table
      v-if="tokens.length > 0"
      :headers="headers"
      :items="tokens"
      item-value="id"
      class="elevation-1"
    >
      <template #[`item.token_prefix`]="{ item }">
        <code>safops_{{ item.token_prefix }}…</code>
      </template>
      <template #[`item.scopes`]="{ item }">
        <v-chip v-for="scope in item.scopes" :key="scope" size="small" class="mr-1">
          {{ scope }}
        </v-chip>
      </template>
      <template #[`item.state`]="{ item }">
        <v-chip :color="stateColor(item)" size="small">{{ stateLabel(item) }}</v-chip>
      </template>
      <template #[`item.last_used_at`]="{ item }">
        {{ formatDateTime(item.last_used_at) }}
      </template>
      <template #[`item.expires_at`]="{ item }">
        {{ formatDateTime(item.expires_at) }}
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
      <template #bottom></template>
    </v-data-table>
    <p v-else class="text-body-1">{{ strings.empty }}</p>

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
import { ContentWidth } from "@saflib/vue/components";
import type { OpsTokenResponse } from "@saflib/ops-spec";
import { useOpsTokensPageLoader } from "./OpsTokens.loader.ts";
import { ops_tokens as strings } from "./OpsTokens.strings.ts";

type Scope = OpsTokenResponse["scopes"][number];
const scopeOptions: Scope[] = ["ops:read", "ops:triage", "ops:alerts-ingest"];

const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Token", key: "token_prefix", sortable: false },
  { title: "Scopes", key: "scopes", sortable: false },
  { title: "State", key: "state", sortable: false },
  { title: "Last used", key: "last_used_at", sortable: true },
  { title: "Expires", key: "expires_at", sortable: true },
  { title: "", key: "actions", sortable: false },
];

const { tokensQuery, createMutation, revokeMutation } = useOpsTokensPageLoader();
const tokens = computed(() => tokensQuery.data.value?.ops_tokens ?? []);

function stateOf(t: OpsTokenResponse): "active" | "revoked" | "expired" {
  if (t.revoked_at) return "revoked";
  if (t.expires_at && new Date(t.expires_at) <= new Date()) return "expired";
  return "active";
}
const stateLabel = (t: OpsTokenResponse) => strings[stateOf(t)];
const stateColor = (t: OpsTokenResponse) =>
  ({ active: "success", revoked: "error", expired: "grey" })[stateOf(t)];

const formatDateTime = (value: string | null): string =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : strings.never;

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
