<template>
  <v-container>
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-4">Compare commits</h1>

        <v-row class="mb-4" density="comfortable">
          <v-col cols="12" md="5">
            <v-select
              v-model="from_hash"
              :items="commitOptions"
              label="Before (baseline)"
              item-title="title"
              item-value="hash"
              :loading="isLoadingList"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="to_hash"
              :items="commitOptions"
              label="After"
              item-title="title"
              item-value="hash"
              :loading="isLoadingList"
              hide-details
            />
          </v-col>
        </v-row>

        <v-progress-linear v-if="isLoadingDiff" indeterminate class="mb-4" />

        <v-alert v-if="listError" type="error" class="mb-4">
          Error loading commits: {{ listError.message }}
        </v-alert>
        <v-alert v-if="diffError" type="error" class="mb-4">
          Error loading diff: {{ diffError.message }}
        </v-alert>

        <CommitDiffView v-if="diff" :diff="diff" />

        <p
          v-else-if="!isLoadingDiff && from_hash && to_hash && !diffError"
          class="text-body-1"
        >
          Select two commits to compare.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useCommits, useCommitDiff } from "../requests/queries";
import CommitDiffView from "../components/CommitDiffView.vue";

const props = defineProps<{
  subdomain: string;
  /** Initial baseline ("before") hash. */
  initialFromHash?: string;
  /** Initial comparison ("after") hash. */
  initialToHash?: string;
}>();

const from_hash = ref(props.initialFromHash ?? "");
const to_hash = ref(props.initialToHash ?? "");

watch(
  () => [props.initialFromHash, props.initialToHash] as const,
  ([from, to]) => {
    if (from) from_hash.value = from;
    if (to) to_hash.value = to;
  },
);

const {
  data: listData,
  isLoading: isLoadingList,
  error: listError,
} = useCommits(props.subdomain, { limit: 100 });

const commitOptions = computed(() =>
  (listData.value?.commits ?? []).map((c) => ({
    hash: c.hash,
    title: `${c.hash.slice(0, 10)} — ${(c.message.split("\n")[0] ?? "").slice(0, 60)}`,
  })),
);

const {
  data: diffData,
  isLoading: isLoadingDiff,
  error: diffError,
} = useCommitDiff(props.subdomain, from_hash, to_hash);

const diff = computed(() => diffData.value?.commit_diff);
</script>
