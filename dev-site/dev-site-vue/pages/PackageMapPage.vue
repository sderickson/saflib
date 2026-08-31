<template>
  <v-container>
    <div class="d-flex align-center mb-4 ga-2 flex-wrap">
      <v-btn variant="text" :to="checkoutPath">← Packages</v-btn>
      <h1 class="text-h4">{{ packageName }}</h1>
      <v-chip v-if="kind" size="small" variant="tonal">{{ kind }}</v-chip>
    </div>

    <p v-if="kind && upcomingSurfaces.length" class="text-body-2 text-medium-emphasis mb-4">
      Surfaces for this kind (later): {{ upcomingSurfaces.join(", ") }}. Showing
      Tests for now.
    </p>

    <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error.message }}</v-alert>
    <v-alert v-if="!hash && !isLoadingCheckout" type="warning" class="mb-4">
      Checkout is not analyzed yet. Scan it from the checkout page first.
    </v-alert>

    <h2 class="text-h6 mb-2">Tests</h2>
    <TestTree v-if="tree.length" :nodes="tree" />
    <p v-else-if="hash && !isLoading" class="text-body-2 text-medium-emphasis">
      No test cases found for this package in the current commit.
    </p>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCheckout, useCommit } from "../requests/queries";
import {
  classifyPackageKind,
  PACKAGE_KIND_SURFACES,
  type PackageKind,
} from "../package-kind";
import { buildPackageTestTree } from "../test-tree";
import TestTree from "../components/TestTree.vue";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    packageName: string;
    checkoutPath?: string;
  }>(),
  {
    checkoutPath: "/checkout",
  },
);

const {
  data: checkout,
  isLoading: isLoadingCheckout,
} = useCheckout(props.subdomain);

const hash = computed(() =>
  checkout.value?.analyzed ? checkout.value.hash : "",
);

const pkgMeta = computed(() =>
  checkout.value?.packages.find((p) => p.package_name === props.packageName),
);

const kind = computed<PackageKind | null>(() => {
  if (!pkgMeta.value) return null;
  return classifyPackageKind(pkgMeta.value.kind);
});

const upcomingSurfaces = computed(() =>
  kind.value ? PACKAGE_KIND_SURFACES[kind.value] : [],
);

const {
  data: commitData,
  isLoading: isLoadingCommit,
  error,
} = useCommit(props.subdomain, hash);

const isLoading = computed(
  () => isLoadingCheckout.value || (!!hash.value && isLoadingCommit.value),
);

const tree = computed(() => {
  const detail = commitData.value?.commit_detail;
  if (!detail || !pkgMeta.value) return [];
  return buildPackageTestTree(
    detail.test_cases,
    props.packageName,
    pkgMeta.value.directory,
  );
});
</script>
