<template>
  <template v-if="node && node.type === 'text'">
    <v-alert
      v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
      :key="'text-nm-' + idx + '-' + mi"
      :type="nm.type === 'error' ? 'error' : 'info'"
      variant="tonal"
      class="mb-2"
      density="comfortable"
    >
      {{ nm.text }}
    </v-alert>
    <p class="text-body-2 mb-2">
      {{ (node.attributes as { text?: { text: string } }).text?.text }}
    </p>
  </template>

  <template v-else-if="node && node.type === 'img'">
    <v-alert
      v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
      :key="'img-nm-' + idx + '-' + mi"
      :type="nm.type === 'error' ? 'error' : 'info'"
      variant="tonal"
      class="mb-2"
      density="comfortable"
    >
      {{ nm.text }}
    </v-alert>
    <div class="mb-4 d-flex justify-center">
      <img
        :src="String((node.attributes as { src?: string }).src ?? '')"
        :alt="node.meta?.label?.text ?? 'Authenticator QR code'"
        class="kratos-flow-form__qr"
      />
    </div>
  </template>

  <template
    v-else-if="node && isKratosInputNode(node) && !ctx.shouldHideSubmit(node)"
  >
    <v-alert
      v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
      :key="'in-nm-' + idx + '-' + mi"
      :type="nm.type === 'error' ? 'error' : 'info'"
      variant="tonal"
      class="mb-2"
      density="comfortable"
    >
      {{ nm.text }}
    </v-alert>
    <input
      v-if="node.attributes.type === 'hidden'"
      type="hidden"
      :name="node.attributes.name"
      :value="node.attributes.value ?? undefined"
    />
    <v-btn
      v-else-if="node.attributes.type === 'button'"
      :id="ctx.elementId(idx)"
      type="button"
      color="primary"
      block
      size="large"
      variant="tonal"
      class="mb-4 mt-1"
      :disabled="submitting"
      @click="runKratosWebAuthnInputClick(node)"
    >
      {{ ctx.kratosSubmitLabel(node) }}
    </v-btn>
    <v-btn
      v-else-if="node.attributes.type === 'submit'"
      :id="ctx.elementId(idx)"
      type="submit"
      color="primary"
      block
      size="large"
      variant="tonal"
      class="mb-8 mt-1"
      :name="node.attributes.name"
      :value="(node.attributes as { value?: string }).value ?? undefined"
      :loading="submitting"
      :disabled="submitting"
    >
      {{ ctx.kratosSubmitLabel(node) }}
    </v-btn>
    <v-text-field
      v-else
      :id="ctx.elementId(idx)"
      v-model="fieldModels[idx]"
      :name="node.attributes.name"
      :type="ctx.effectiveInputType(node, idx)"
      :label="node.meta?.label?.text"
      :required="node.attributes.required"
      :prepend-inner-icon="ctx.prependIcon(node)"
      :append-inner-icon="appendInnerIconForField(node, idx)"
      :disabled="submitting"
      density="comfortable"
      class="mb-4"
      :class="identifierPasskeyClass(node)"
      autocomplete="off"
      @click:append-inner="onAppendInnerForField(idx, node)"
    />
  </template>
</template>

<script setup lang="ts">
import type { UiNode } from "@ory/client";
import { computed, inject, unref } from "vue";
import { isKratosInputNode, kratosEffectiveInputType } from "./kratosNodeUtils.ts";
import { runKratosWebAuthnInputClick } from "./kratosWebAuthnInputClick.ts";
import {
  KRATOS_FLOW_UI_INJECT,
  type KratosFlowUiInject,
} from "./kratosFlowUiInject.ts";

const props = defineProps<{
  idx: number;
  /**
   * When the passkey/WebAuthn login trigger is merged into the identifier field (login only),
   * pass the hidden trigger node so the cloud-key icon can invoke it.
   */
  passkeyLoginTrigger?: UiNode | null;
}>();

const ctx = inject(KRATOS_FLOW_UI_INJECT) as KratosFlowUiInject;

const fieldModels = ctx.fieldModels;
const submitting = computed(() => unref(ctx.submitting));

const node = computed(
  () => ctx.displayNodes.value[props.idx] as UiNode | undefined,
);

function appendInnerIconForField(node: UiNode, idx: number): string | undefined {
  const fromCtx = ctx.appendInnerIcon(node, idx);
  if (fromCtx) return fromCtx;
  if (
    props.passkeyLoginTrigger &&
    isKratosInputNode(node) &&
    node.attributes.name === "identifier"
  ) {
    return "mdi-cloud-key";
  }
  return undefined;
}

function identifierPasskeyClass(node: UiNode): string | undefined {
  if (
    props.passkeyLoginTrigger &&
    isKratosInputNode(node) &&
    node.attributes.name === "identifier"
  ) {
    return "kratos-flow-form__identifier-with-passkey";
  }
  return undefined;
}

function onAppendInnerForField(idx: number, node: UiNode) {
  if (!isKratosInputNode(node)) return;
  if (kratosEffectiveInputType(node.attributes) === "password") {
    ctx.onAppendInnerClick(idx, node);
    return;
  }
  if (
    props.passkeyLoginTrigger &&
    node.attributes.name === "identifier"
  ) {
    runKratosWebAuthnInputClick(props.passkeyLoginTrigger);
  }
}
</script>

<style scoped>
.kratos-flow-form__qr {
  width: 192px;
  height: 192px;
  object-fit: contain;
}
</style>
