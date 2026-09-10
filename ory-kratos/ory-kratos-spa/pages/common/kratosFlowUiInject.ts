import type { UiNode, UiText } from "@ory/client";
import type { ComputedRef, InjectionKey, Ref } from "vue";

/** Context for {@link KratosFlowUiNodeAt.vue} (one row per `flow.ui.nodes` index). */
export interface KratosFlowUiInject {
  displayNodes: ComputedRef<readonly UiNode[]>;
  submitting: ComputedRef<boolean>;
  idPrefix: ComputedRef<string>;
  fieldModels: Ref<Record<number, string>>;
  visibleNodeMessages: (node: UiNode, idx: number) => UiText[];
  shouldHideSubmit: (node: UiNode) => boolean;
  kratosSubmitLabel: (node: UiNode) => string;
  prependIcon: (node: UiNode) => string | undefined;
  effectiveInputType: (node: UiNode, idx: number) => string;
  appendInnerIcon: (node: UiNode, idx: number) => string | undefined;
  onAppendInnerClick: (idx: number, node: UiNode) => void;
  elementId: (idx: number) => string;
}

export const KRATOS_FLOW_UI_INJECT: InjectionKey<KratosFlowUiInject> =
  Symbol("KratosFlowUi");
