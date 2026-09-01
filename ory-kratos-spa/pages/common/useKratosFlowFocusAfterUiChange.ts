import type { UiNode } from "@ory/client";
import { nextTick, watch, type Ref } from "vue";
import { isKratosInputNode } from "./kratosNodeUtils.ts";

export function focusableInputNames(flow: { ui: { nodes: UiNode[] } }): string[] {
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

function cssAttrEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isVisibleFocusable(el: HTMLElement): boolean {
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    if (el.disabled) return false;
    if (
      el instanceof HTMLInputElement &&
      (el.type === "hidden" || el.type === "submit" || el.type === "button")
    ) {
      return false;
    }
  }
  const inactiveTab = el.closest(".v-window-item");
  if (
    inactiveTab &&
    !inactiveTab.classList.contains("v-window-item--active")
  ) {
    return false;
  }
  if (el.offsetParent !== null) return true;
  return el.isConnected;
}

function focusFieldByName(form: HTMLFormElement, name: string): boolean {
  const byFormElements = inputInFormByName(form, name);
  if (byFormElements && isVisibleFocusable(byFormElements)) {
    byFormElements.focus();
    return true;
  }

  const named = form.querySelectorAll(`[name="${cssAttrEscape(name)}"]`);
  for (const el of named) {
    if (el instanceof HTMLElement && isVisibleFocusable(el)) {
      el.focus();
      return true;
    }
  }

  for (const el of named) {
    if (!(el instanceof HTMLElement)) continue;
    const container =
      el.closest(".v-input, .kratos-flow-form__field, fieldset") ??
      el.parentElement;
    const visible = container?.querySelector(
      "input:not([type='hidden']), textarea, select",
    );
    if (visible instanceof HTMLElement && isVisibleFocusable(visible)) {
      visible.focus();
      return true;
    }
  }

  return false;
}

export function focusFirstFocusableInForm(form: HTMLFormElement): boolean {
  const candidates = form.querySelectorAll<HTMLElement>(
    "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select",
  );
  for (const el of candidates) {
    if (isVisibleFocusable(el)) {
      el.focus();
      return true;
    }
  }
  return false;
}

/** Focus a named Kratos field when possible; otherwise the first visible control in the form. */
export function focusKratosFlowFormField(
  form: HTMLFormElement,
  preferredName?: string,
): boolean {
  if (preferredName && focusFieldByName(form, preferredName)) return true;
  return focusFirstFocusableInForm(form);
}

function scheduleFocus(
  formRef: Ref<HTMLFormElement | null>,
  preferredName?: string,
) {
  nextTick(() => {
    requestAnimationFrame(() => {
      const form = formRef.value;
      if (!form) return;
      focusKratosFlowFormField(form, preferredName);
    });
  });
}

/**
 * On initial render and after a Kratos flow update (e.g. email step → password step), focus the
 * first focusable field so keyboard users land in the form immediately.
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
      const isInitial = !prevFlow;
      const preferredName = isInitial
        ? names[0]
        : names.find((n) => !prevNames.includes(n));
      prevNames = names;
      if (!isInitial && !preferredName) return;
      scheduleFocus(formRef, preferredName);
    },
    { immediate: true },
  );
}
