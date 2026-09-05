import type { UiNode } from "@ory/client";
import { type ComputedRef, type Ref, computed, ref, unref, watch } from "vue";
import { isKratosInputNode, kratosEffectiveInputType } from "./kratosNodeUtils.ts";

function nodesInputSignature(nodes: readonly UiNode[]): string {
  return nodes
    .map((node, i) => {
      if (!isKratosInputNode(node)) return "";
      return `${i}:${node.attributes.name}:${String(node.attributes.value ?? "")}:${node.attributes.type}`;
    })
    .join("|");
}

/**
 * Keeps v-model maps in sync when Kratos returns a new flow (e.g. new CSRF) while preserving the same
 * `v-for` index keys as `flow.ui.nodes` (or a filtered node list).
 */
export function useKratosFieldModelsForNodes(
  nodes: Ref<readonly UiNode[]> | ComputedRef<readonly UiNode[]>,
) {
  const fieldModels = ref<Record<number, string>>({});
  const passwordVisible = ref<Record<number, boolean>>({});

  watch(
    () => {
      const list = unref(nodes);
      return list.length ? nodesInputSignature(list) : "";
    },
    () => {
      const list = unref(nodes);
      const next: Record<number, string> = {};
      const nextPwd: Record<number, boolean> = {};
      list.forEach((node, idx) => {
        if (!isKratosInputNode(node)) return;
        const t = node.attributes.type;
        if (t === "hidden" || t === "submit" || t === "button") return;
        next[idx] = String(node.attributes.value ?? "");
        if (kratosEffectiveInputType(node.attributes) === "password") {
          nextPwd[idx] = false;
        }
      });
      fieldModels.value = next;
      passwordVisible.value = nextPwd;
    },
    { immediate: true },
  );

  return { fieldModels, passwordVisible };
}

/** Convenience when the source is a full flow's `ui.nodes`. */
export function useKratosFieldModelsForFlowNodes(
  flow: Ref<{ ui: { nodes: UiNode[] } } | null | undefined>,
) {
  const nodes = computed(() => flow.value?.ui.nodes ?? []);
  return useKratosFieldModelsForNodes(nodes);
}
