import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { TanstackError } from "@saflib/sdk";
import { useCommitPackage } from "./requests/queries.ts";
import {
  diffPackageDetails,
  emptyOverlay,
  type OverlayPackageDetail,
  type PackageChangeOverlay,
  type PathRename,
} from "./package-change-overlay.ts";

/**
 * Fetch HEAD (or the given hash) plus an optional merge-base snapshot and
 * compute the per-symbol overlay. 404 on either side is treated as "package
 * missing at that commit" when compare is on.
 */
export function useComparedPackageDetail(
  subdomain: string,
  commit_hash: MaybeRefOrGetter<string>,
  package_name: MaybeRefOrGetter<string>,
  options: {
    compareFromHash?: MaybeRefOrGetter<string | undefined>;
    product_root?: MaybeRefOrGetter<string | undefined>;
    pathRenames?: MaybeRefOrGetter<PathRename[] | undefined>;
  } = {},
) {
  const compareFromHash = () => toValue(options.compareFromHash);
  const comparing = () => Boolean(compareFromHash());

  const after = useCommitPackage(
    subdomain,
    commit_hash,
    package_name,
    { allowMissing: comparing },
  );
  const before = useCommitPackage(
    subdomain,
    () => compareFromHash() ?? "",
    package_name,
    { allowMissing: true },
  );

  const isLoading = computed(
    () => after.isLoading.value || (comparing() && before.isLoading.value),
  );

  const error = computed(() => {
    if (after.error.value && !(comparing() && isMissing(after.error.value))) {
      return after.error.value;
    }
    if (comparing() && before.error.value && !isMissing(before.error.value)) {
      return before.error.value;
    }
    return null;
  });

  const beforeDetail = computed(
    () => (before.data.value?.package_detail ?? null) as OverlayPackageDetail | null,
  );
  const afterDetail = computed(
    () => (after.data.value?.package_detail ?? null) as OverlayPackageDetail | null,
  );

  const overlay = computed((): PackageChangeOverlay | null => {
    if (!comparing()) return null;
    if (isLoading.value) return emptyOverlay();
    return diffPackageDetails(beforeDetail.value, afterDetail.value, {
      product_root: toValue(options.product_root) ?? "",
      pathRenames: toValue(options.pathRenames) ?? [],
    });
  });

  const detail = computed(
    () => afterDetail.value ?? beforeDetail.value,
  );

  return {
    isLoading,
    error,
    overlay,
    detail,
    beforeDetail,
    afterDetail,
    comparing: computed(() => comparing()),
  };
}

function isMissing(error: TanstackError): boolean {
  return error.status === 404;
}
