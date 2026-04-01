import type { UiNode } from "@ory/client";
import { nextTick, watch, type Ref } from "vue";
import { isKratosInputNode } from "./kratosNodeUtils.ts";

function focusableInputNames(flow: { ui: { nodes: UiNode[] } }): string[] {
  const names: string[] = [];
  for (const node of flow.ui.nodes) {
    if (!isKratosInputNode(node)) continue;
    const t = node.attributes.type;
    if (t === "submit" || t === "hidden") continue;
    if (node.attributes.name === "csrf_token") continue;
    names.push(node.attributes.name);
  }
  return names;
}

function inputInFormByName(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | null {
  const els = form.elements;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (el instanceof HTMLInputElement && el.name === name) return el;
  }
  return null;
}

/**
 * After a Kratos flow update (e.g. email step → password step), focus the first newly appeared
 * focusable field so keyboard users do not lose context.
 */
export function useKratosFlowFocusAfterUiChange(
  flowRef: Ref<{ ui: { nodes: UiNode[] } } | null | undefined>,
  formRef: Ref<HTMLFormElement | null>,
) {
  let prevNames: string[] = [];
  watch(
    () => flowRef.value,
    (flow, prevFlow) => {
      if (!flow) return;
      const names = focusableInputNames(flow);
      if (!prevFlow) {
        prevNames = names;
        return;
      }
      const firstNew = names.find((n) => !prevNames.includes(n));
      prevNames = names;
      if (!firstNew) return;
      nextTick(() => {
        const form = formRef.value;
        if (!form) return;
        inputInFormByName(form, firstNew)?.focus();
      });
    },
  );
}
