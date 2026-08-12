<template>
  <v-container>
    <div class="d-flex align-center mb-4 ga-2">
      <v-btn variant="text" :to="hubPath">← Hub</v-btn>
      <h1 class="text-h4">Current checkout</h1>
    </div>

    <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>
    <v-alert v-if="scanError" type="error" class="mb-4">
      Scan failed: {{ scanError.message }}
    </v-alert>

    <template v-if="checkout">
      <v-sheet class="pa-4 mb-6" border rounded>
        <div class="text-caption text-medium-emphasis">HEAD</div>
        <div class="d-flex flex-wrap align-center ga-3 mb-2">
          <code>{{ shortHash(checkout.hash) }}</code>
          <v-chip
            size="small"
            :color="checkout.analyzed ? 'success' : 'warning'"
          >
            {{ checkout.analyzed ? "Analyzed" : "Not analyzed" }}
          </v-chip>
        </div>
        <div class="text-body-1 mb-1">{{ firstLine(checkout.message) }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ formatDateTime(checkout.authoredAt) }}
        </div>

        <v-btn
          v-if="!checkout.analyzed"
          class="mt-4"
          color="primary"
          :loading="isScanning"
          :disabled="isScanning"
          @click="scanThisCommit"
        >
          Scan this commit
        </v-btn>
      </v-sheet>

      <template v-if="checkout.analyzed">
        <h2 class="text-h6 mb-3">Packages</h2>
        <v-data-table
          :headers="headers"
          :items="packageRows"
          item-value="packageName"
          class="elevation-1"
        >
          <template #[`item.kind`]="{ item }">
            <v-chip size="small" variant="tonal">{{ item.kind }}</v-chip>
          </template>
          <template #[`item.metrics`]="{ item }">
            {{ item.sourceLines }} src /
            {{ item.testLines }} test LOC · {{ item.testFiles }} test files
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              size="small"
              variant="text"
              :to="packagePath(item.packageName)"
            >
              Open
            </v-btn>
          </template>
          <template #bottom></template>
        </v-data-table>
      </template>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCheckout, useScanMutation } from "../requests/queries";
import { classifyPackageKind } from "../package-kind";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    hubPath?: string;
    packagePath?: (packageName: string) => string;
  }>(),
  {
    hubPath: "/",
    packagePath: (name: string) =>
      `/checkout/packages/${encodeURIComponent(name)}`,
  },
);

const headers = [
  { title: "Kind", key: "kind", sortable: false },
  { title: "Package", key: "packageName", sortable: false },
  { title: "Directory", key: "directory", sortable: false },
  { title: "Metrics", key: "metrics", sortable: false },
  { title: "", key: "actions", sortable: false },
];

const {
  data: checkout,
  isLoading,
  error,
  refetch,
} = useCheckout(props.subdomain);

const {
  mutate: scan,
  isPending: isScanning,
  error: scanError,
} = useScanMutation(props.subdomain);

const packageRows = computed(() =>
  (checkout.value?.packages ?? []).map((p) => ({
    ...p,
    kind: classifyPackageKind(p.packageName, p.directory),
  })),
);

const scanThisCommit = () => {
  if (!checkout.value) return;
  scan(
    { commitHash: checkout.value.hash },
    { onSuccess: () => refetch() },
  );
};

const shortHash = (hash: string) => hash.slice(0, 10);
const firstLine = (message: string) => message.split("\n")[0] ?? message;
const formatDateTime = (dateTimeString: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch {
    return dateTimeString;
  }
};
</script>
