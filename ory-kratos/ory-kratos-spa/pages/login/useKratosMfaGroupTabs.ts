import { AuthenticatorAssuranceLevel } from "@ory/client";
import type { UiNode } from "@ory/client";
import { computed, ref, watch, type MaybeRefOrGetter, toValue } from "vue";

export type KratosMfaGroup = { key: string; indices: number[] };

/**
 * Login AAL2: when multiple non-`default` UI groups are present (e.g. `code` + `totp`),
 * the login form can render those groups under tabs instead of a single column.
 *
 * Pass the same `displayNodes` list passed to `KratosFlowUi` as `:nodes` (e.g. filtered for passkey merge).
 */
export function useKratosMfaGroupTabs(
  flow: MaybeRefOrGetter<{ id?: string; requested_aal?: string }>,
  displayNodes: MaybeRefOrGetter<readonly UiNode[]>,
) {
  const isSecondFactorStep = computed(
    () => toValue(flow).requested_aal === AuthenticatorAssuranceLevel.Aal2,
  );

  const nonDefaultGroupsInOrder = computed((): KratosMfaGroup[] => {
    const list = toValue(displayNodes);
    const order: string[] = [];
    const seen = new Set<string>();
    const map = new Map<string, number[]>();
    for (let i = 0; i < list.length; i++) {
      const n = list[i]!;
      const g = n.group ?? "default";
      if (g === "default") continue;
      if (!seen.has(g)) {
        seen.add(g);
        order.push(g);
        map.set(g, []);
      }
      map.get(g)!.push(i);
    }
    return order.map((key) => ({ key, indices: map.get(key)! }));
  });

  const defaultNodeIndices = computed(() => {
    const list = toValue(displayNodes);
    const out: number[] = [];
    for (let i = 0; i < list.length; i++) {
      if ((list[i]!.group ?? "default") === "default") out.push(i);
    }
    return out;
  });

  const showMfaGroupTabs = computed(
    () =>
      isSecondFactorStep.value && nonDefaultGroupsInOrder.value.length > 1,
  );

  const mfaTab = ref(0);

  watch(
    () => toValue(flow).id ?? "",
    () => {
      mfaTab.value = 0;
    },
  );

  return {
    isSecondFactorStep,
    nonDefaultGroupsInOrder,
    defaultNodeIndices,
    showMfaGroupTabs,
    mfaTab,
  };
}
