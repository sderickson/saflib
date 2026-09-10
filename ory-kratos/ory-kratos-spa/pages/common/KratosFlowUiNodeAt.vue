<template>
  <template v-if="node && node.type === 'text'">
    <div class="mb-4">
      <p class="text-body-2 mb-2">
        {{ (node.attributes as { text?: { text: string } }).text?.text }}
      </p>
      <p
        v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
        :key="'text-nm-' + idx + '-' + mi"
        class="text-body-2 mt-1"
        :class="nm.type === 'error' ? 'text-error' : 'text-medium-emphasis'"
      >
        {{ nm.text }}
      </p>
    </div>
  </template>

  <template v-else-if="node && node.type === 'img'">
    <div class="mb-4">
      <div class="mb-2 d-flex justify-center">
        <img
          :src="String((node.attributes as { src?: string }).src ?? '')"
          :alt="node.meta?.label?.text ?? 'Authenticator QR code'"
          class="kratos-flow-form__qr"
        />
      </div>
      <p
        v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
        :key="'img-nm-' + idx + '-' + mi"
        class="text-body-2 mt-1"
        :class="nm.type === 'error' ? 'text-error' : 'text-medium-emphasis'"
      >
        {{ nm.text }}
      </p>
    </div>
  </template>

  <template
    v-else-if="node && isKratosInputNode(node) && !ctx.shouldHideSubmit(node)"
  >
    <input
      v-if="node.attributes.type === 'hidden'"
      type="hidden"
      :name="node.attributes.name"
      :value="node.attributes.value ?? undefined"
    />
    <div v-else-if="node.attributes.type === 'button'" class="mb-4 mt-1">
      <v-btn
        :id="ctx.elementId(idx)"
        type="button"
        color="primary"
        block
        size="large"
        variant="tonal"
        :disabled="submitting"
        @click="runKratosWebAuthnInputClick(node)"
      >
        {{ ctx.kratosSubmitLabel(node) }}
      </v-btn>
      <p
        v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
        :key="'btn-nm-' + idx + '-' + mi"
        class="text-body-2 mt-2"
        :class="nm.type === 'error' ? 'text-error' : 'text-medium-emphasis'"
      >
        {{ nm.text }}
      </p>
    </div>
    <div v-else-if="node.attributes.type === 'submit'" class="mb-8 mt-1">
      <v-btn
        :id="ctx.elementId(idx)"
        type="submit"
        color="primary"
        block
        size="large"
        variant="tonal"
        :name="node.attributes.name"
        :value="(node.attributes as { value?: string }).value ?? undefined"
        :loading="submitting"
        :disabled="submitting"
      >
        {{ ctx.kratosSubmitLabel(node) }}
      </v-btn>
      <p
        v-for="(nm, mi) in ctx.visibleNodeMessages(node, idx)"
        :key="'sub-nm-' + idx + '-' + mi"
        class="text-body-2 mt-2"
        :class="nm.type === 'error' ? 'text-error' : 'text-medium-emphasis'"
      >
        {{ nm.text }}
      </p>
    </div>
    <template v-else-if="isKratosTraitsPhoneInputNode(node)">
      <!--
        Visible field shows formatted digits; FormData must receive E.164 from the hidden input
        (see UsPhoneNumberInput update:modelValue).
      -->
      <div class="mb-4">
        <input
          type="hidden"
          :name="node.attributes.name"
          :value="fieldModels[idx]"
        />
        <UsPhoneNumberInput
          v-model="fieldModels[idx]"
          :id="ctx.elementId(idx)"
          :label="kratosPhoneFieldLabel(node)"
          :required="!!node.attributes.required"
          :disabled="submitting"
          :error-messages="nodeErrorMessages(node, idx)"
          density="comfortable"
          autocomplete="tel"
        />
        <p
          v-for="(msg, mi) in nodeInfoMessages(node, idx)"
          :key="'phone-info-' + idx + '-' + mi"
          class="text-body-2 text-medium-emphasis mt-1"
        >
          {{ msg }}
        </p>
      </div>
    </template>
    <div v-else class="mb-4">
      <v-text-field
        :id="ctx.elementId(idx)"
        v-model="fieldModels[idx]"
        :name="node.attributes.name"
        :type="ctx.effectiveInputType(node, idx)"
        :label="
          node.meta?.label?.text?.trim() ||
          kratosFallbackLabelForInputName(node.attributes.name)
        "
        :required="node.attributes.required"
        :prepend-inner-icon="ctx.prependIcon(node)"
        :append-inner-icon="appendInnerIconForField(node, idx)"
        :disabled="submitting"
        :error-messages="nodeErrorMessages(node, idx)"
        density="comfortable"
        :class="identifierPasskeyClass(node)"
        autocomplete="off"
        @click:append-inner="onAppendInnerForField(idx, node)"
      />
      <p
        v-for="(msg, mi) in nodeInfoMessages(node, idx)"
        :key="'tf-info-' + idx + '-' + mi"
        class="text-body-2 text-medium-emphasis mt-1"
      >
        {{ msg }}
      </p>
    </div>
  </template>
</template>

<script setup lang="ts">
import type { UiNode } from "@ory/client";
import { computed, inject, unref } from "vue";
import { UsPhoneNumberInput } from "@saflib/vue/components";
import { kratosFallbackLabelForInputName } from "./kratosInputFieldLabel.ts";
import {
  isKratosInputNode,
  isKratosTraitsPhoneInputNode,
  kratosEffectiveInputType,
} from "./kratosNodeUtils.ts";
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

function kratosPhoneFieldLabel(node: UiNode): string {
  if (!isKratosInputNode(node)) return "Phone";
  return node.meta?.label?.text?.trim() || "Phone";
}

/** Kratos server messages for `error-messages` / red outline on Vuetify fields. */
function nodeErrorMessages(node: UiNode, idx: number): string[] {
  return ctx
    .visibleNodeMessages(node, idx)
    .filter((m) => m.type === "error")
    .map((m) => m.text);
}

/** Non-error node messages (shown as muted text below the field). */
function nodeInfoMessages(node: UiNode, idx: number): string[] {
  return ctx
    .visibleNodeMessages(node, idx)
    .filter((m) => m.type !== "error")
    .map((m) => m.text);
}
</script>

<style scoped>
.kratos-flow-form__qr {
  width: 192px;
  height: 192px;
  object-fit: contain;
}
</style>
