<template>
  <v-card
    v-if="flow"
    variant="outlined"
    class="pa-4"
    :class="{ 'opacity-60': submitting }"
  >
    <form
      ref="formRef"
      class="kratos-flow-form"
      novalidate
      :aria-busy="submitting ? 'true' : undefined"
      @pointerdown.capture="onFormPointerDownCapture"
      @submit.prevent="onSubmit"
    >
      <v-alert
        v-for="(m, i) in visibleFlowMessages"
        :key="'flow-msg-' + i"
        :type="m.type === 'error' ? 'error' : 'info'"
        variant="tonal"
        class="mb-3"
        density="comfortable"
      >
        {{ m.text }}
      </v-alert>

      <fieldset class="kratos-flow-form__fieldset">
        <slot name="fieldset" :display-nodes="displayNodes" :all-node-indices="allNodeIndices">
          <template v-for="idx in allNodeIndices" :key="'node-' + idx">
            <slot name="node" :node="displayNodes[idx]!" :idx="idx">
              <KratosFlowUiNodeAt :idx="idx" />
            </slot>
          </template>
        </slot>
      </fieldset>
    </form>
  </v-card>
</template>

<script setup lang="ts">
import type { UiContainer, UiNode, UiText } from "@ory/client";
import { computed, onBeforeUnmount, provide, ref, watch } from "vue";
import KratosFlowUiNodeAt from "./KratosFlowUiNodeAt.vue";
import {
  KRATOS_FLOW_UI_INJECT,
  type KratosFlowUiInject,
} from "./kratosFlowUiInject.ts";
import type { KratosFlowUiMessageFilterContext } from "./kratosUiMessages.ts";
import { kratosPrependInnerIconForFieldName } from "./kratosVuetifyFieldIcons.ts";
import { useKratosFieldModelsForNodes } from "./useKratosFieldModelsForNodes.ts";
import { useKratosFlowFocusAfterUiChange } from "./useKratosFlowFocusAfterUiChange.ts";
import { useKratosOryWebAuthnScripts } from "./useKratosOryWebAuthnScripts.ts";
import { patchKratosFormSubmitForOryProgrammaticSubmit } from "./kratosFormSubmitOryPatch.ts";
import { kratosPasskeyRemoveButtonLabel } from "./kratosPasskeyRemoveLabel.ts";
import {
  isKratosInputNode,
  kratosEffectiveInputType,
} from "./kratosNodeUtils.ts";

/** Any browser self-service flow whose `ui.nodes` we render. */
export type KratosFlowUiModel = {
  ui: Pick<UiContainer, "nodes" | "messages">;
};

defineSlots<{
  fieldset(props: {
    displayNodes: readonly UiNode[];
    allNodeIndices: readonly number[];
  }): unknown;
  node(props: { node: UiNode; idx: number }): unknown;
}>();

const props = withDefaults(
  defineProps<{
    flow: KratosFlowUiModel | null | undefined;
    /**
     * When set, render these nodes instead of `flow.ui.nodes` (e.g. settings tabs use a subset).
     */
    nodes?: UiNode[];
    submitting: boolean;
    /** Prefix for element `id`s (`${idPrefix}-${nodeIndex}`). */
    idPrefix?: string;
    /** Submit inputs to omit (e.g. in-flow resend when the page provides its own resend). */
    hideSubmitNames?: string[];
    /**
     * Return false to hide a message. Used e.g. to soften Kratos "Property … is missing" on the first
     * step of multi-field flows (registration: email → password).
     */
    messageFilter?: (
      message: UiText,
      context: KratosFlowUiMessageFilterContext,
    ) => boolean;
    /**
     * Ory `webauthn.js` calls `form.submit()` after passkey/WebAuthn, which skips `submit` events.
     * When true, patch this form so programmatic submit dispatches a cancelable event first (SPA
     * `@submit.prevent` runs; see `kratosFormSubmitOryPatch.ts`).
     */
    interceptOryProgrammaticSubmit?: boolean;
    /**
     * When Kratos labels a passkey as "unnamed" (no AAGUID display name), use this (e.g. account
     * email) for remove-button copy instead.
     */
    identityPasskeyDisplayFallback?: string;
  }>(),
  {
    idPrefix: "kratos-flow",
    hideSubmitNames: () => [],
    interceptOryProgrammaticSubmit: false,
    identityPasskeyDisplayFallback: undefined,
  },
);

const visibleFlowMessages = computed(() => {
  let raw = props.flow?.ui.messages ?? [];
  const nf = props.messageFilter;
  if (nf) raw = raw.filter((m) => nf(m, { kind: "flow" }));
  if (props.submitting) raw = raw.filter((m) => m.type !== "error");
  return raw;
});

function visibleNodeMessages(node: UiNode, idx: number): UiText[] {
  let raw = node.messages ?? [];
  const nf = props.messageFilter;
  if (nf) raw = raw.filter((m) => nf(m, { kind: "node", node, nodeIdx: idx }));
  if (props.submitting) raw = raw.filter((m) => m.type !== "error");
  return raw;
}

const displayNodes = computed(() => props.nodes ?? props.flow?.ui.nodes ?? []);

const allNodeIndices = computed(() => displayNodes.value.map((_, i) => i));

const flowForFocus = computed(() => {
  const f = props.flow;
  if (!f) return null;
  return {
    ui: {
      ...f.ui,
      nodes: displayNodes.value,
    },
  };
});

const formRef = ref<HTMLFormElement | null>(null);

/** When {@link SubmitEvent.submitter} is null (often with Vuetify `v-btn`), `FormData` loses the clicked control. */
const lastPointerSubmitter = ref<HTMLButtonElement | HTMLInputElement | null>(null);

function onFormPointerDownCapture(ev: Event) {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const el = t.closest("button[type='submit'],input[type='submit']");
  if (el instanceof HTMLButtonElement && el.type === "submit") {
    lastPointerSubmitter.value = el;
    return;
  }
  if (el instanceof HTMLInputElement && el.type === "submit") {
    lastPointerSubmitter.value = el;
  }
}
useKratosFlowFocusAfterUiChange(flowForFocus, formRef);

const { fieldModels, passwordVisible } =
  useKratosFieldModelsForNodes(displayNodes);

useKratosOryWebAuthnScripts(displayNodes);

let unpatchOryFormSubmit: (() => void) | undefined;
watch(
  () => [formRef.value, props.interceptOryProgrammaticSubmit] as const,
  ([form, intercept]) => {
    unpatchOryFormSubmit?.();
    unpatchOryFormSubmit = undefined;
    if (form && intercept) {
      unpatchOryFormSubmit =
        patchKratosFormSubmitForOryProgrammaticSubmit(form);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  unpatchOryFormSubmit?.();
});

const prefix = computed(() => props.idPrefix);
function elementId(idx: number) {
  return `${prefix.value}-${idx}`;
}

function shouldHideSubmit(node: UiNode): boolean {
  if (!isKratosInputNode(node)) return false;
  if (node.attributes.type !== "submit") return false;
  const name = node.attributes.name;
  return props.hideSubmitNames.includes(name);
}

function kratosSubmitLabel(node: UiNode) {
  if (!isKratosInputNode(node)) return "";
  const passkeyRemove = kratosPasskeyRemoveButtonLabel(
    node,
    displayNodes.value,
    props.identityPasskeyDisplayFallback,
  );
  if (passkeyRemove) return passkeyRemove;
  const t = node.meta?.label?.text?.trim();
  if (t) return t;
  const v = (node.attributes as { value?: string }).value;
  return v != null ? String(v) : "";
}

const emit = defineEmits<{
  submit: [form: HTMLFormElement, submitter: HTMLElement | null];
}>();

function prependIcon(node: UiNode): string | undefined {
  if (!isKratosInputNode(node)) return undefined;
  return kratosPrependInnerIconForFieldName(node.attributes.name);
}

function effectiveInputType(node: UiNode, idx: number): string {
  if (!isKratosInputNode(node)) return "text";
  const eff = kratosEffectiveInputType(node.attributes);
  if (eff === "password" && passwordVisible.value[idx]) return "text";
  return eff;
}

function appendInnerIcon(node: UiNode, idx: number): string | undefined {
  if (!isKratosInputNode(node)) return undefined;
  if (kratosEffectiveInputType(node.attributes) !== "password")
    return undefined;
  return passwordVisible.value[idx] ? "mdi-eye-off" : "mdi-eye";
}

function onAppendInnerClick(idx: number, node: UiNode) {
  if (!isKratosInputNode(node)) return;
  if (kratosEffectiveInputType(node.attributes) !== "password") return;
  togglePasswordVisibility(idx, node);
}

provide(KRATOS_FLOW_UI_INJECT, {
  displayNodes,
  submitting: computed(() => props.submitting),
  idPrefix: prefix,
  fieldModels,
  visibleNodeMessages,
  shouldHideSubmit,
  kratosSubmitLabel,
  prependIcon,
  effectiveInputType,
  appendInnerIcon,
  onAppendInnerClick,
  elementId,
} satisfies KratosFlowUiInject);

function togglePasswordVisibility(idx: number, node: UiNode) {
  if (!isKratosInputNode(node)) return;
  if (kratosEffectiveInputType(node.attributes) !== "password") return;
  passwordVisible.value = {
    ...passwordVisible.value,
    [idx]: !passwordVisible.value[idx],
  };
}

function onSubmit(ev: Event) {
  const el = ev.currentTarget;
  if (!(el instanceof HTMLFormElement)) return;
  const se = ev as SubmitEvent;
  let sub: HTMLElement | null = (se.submitter as HTMLElement | null) ?? null;
  if (!sub && lastPointerSubmitter.value) {
    sub = lastPointerSubmitter.value;
  }
  lastPointerSubmitter.value = null;
  emit("submit", el, sub);
}
</script>

<style scoped>
.kratos-flow-form__fieldset {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}
</style>
