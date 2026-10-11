<template>
  <div class="run-view">
    <RunViewHeader
      :run-id="vm.runId"
      :run-clock="vm.runClock"
      :current-step-index="vm.headerStepDisplay"
      :status-visual="vm.statusVisual"
      :can-see-changes="Boolean(vm.run?.base_commit_hash)"
      @see-changes="vm.openReflection"
    />

    <div class="run-view__body">
      <RunViewStepSidebar
        :steps="vm.steps"
        :step-class="vm.stepStatusClasses"
        @select-step="vm.scrollToStep"
      />

      <RunViewPreviewPane
        v-if="vm.showPreviewPane"
        :preview-shown="vm.previewShown"
        :preview-pending="vm.previewPending"
        :preview-error="vm.previewError"
        :preview-data-ready="vm.previewDataReady"
        :mechanical-failures="vm.previewMechanicalFailures"
        :preview-files="vm.previewFiles"
        @open-preview="vm.openPreview"
        @close-preview="vm.closePreview"
      />
      <RunViewLogPane
        v-else
        :show-jump-to-latest="vm.showJumpToLatest"
        :log-items="vm.logItems"
        :loading-older="vm.logsLoadingOlder"
        :loading-newer="vm.logsLoadingNewer"
        :sticky-agent-input="vm.showStickyAgentInput"
        :item-key="vm.logItemKey"
        :step-index="vm.logItemStepIndex"
        :is-last-agent-input="vm.isLastAgentInput"
        :on-scroll="vm.onLogScroll"
        :on-root-ref="vm.bindLogContainer"
        @return-live="vm.returnToLiveLogs"
      />
    </div>

    <RunViewFooter
      :run-id="vm.runId"
      :run="vm.run"
      :pause-message="vm.pauseMessage"
      :failure-message="vm.failureMessage"
      :was-cancelled="vm.wasCancelled"
      :is-advancing="vm.isAdvancing"
      :is-other-run-active="vm.isOtherRunActive"
      :is-active-run="vm.isActiveRun"
      :auto-mode="vm.autoMode"
      :extra-prompt="vm.extraPrompt"
      :direct-message="vm.directMessage"
      :agent-message-pending="vm.agentMessagePending"
      :agent-message-error="vm.agentMessageError"
      :agent-message-blocked-reason="vm.agentMessageBlockedReason"
      :create-pending="vm.createPending"
      :create-error="vm.createError"
      :cancel-pending="vm.cancelPending"
      :reset-open="vm.resetConfirmOpen"
      :goto-open="vm.gotoModalOpen"
      :goto-pending="vm.gotoPending"
      :goto-tree-loading="vm.gotoTreeLoading"
      :goto-tree-error="vm.gotoTreeError"
      :goto-error="vm.gotoError"
      :goto-tree="vm.flatStepTree"
      :volume="vm.volume"
      :muted="vm.muted"
      :volume-icon="vm.volumeIcon"
      @update:extra-prompt="vm.extraPrompt = $event"
      @update:direct-message="vm.directMessage = $event"
      @send-direct="vm.sendDirectMessage"
      @continue="vm.continueRun"
      @init="vm.initWorkflow"
      @open-reset="vm.openReset"
      @update:reset-open="vm.resetConfirmOpen = $event"
      @confirm-reset="vm.confirmReset"
      @open-goto="vm.openGotoModal"
      @update:goto-open="vm.gotoModalOpen = $event"
      @goto-path="vm.selectGotoPath"
      @stop="vm.selectStop"
      @play-step="vm.selectStep"
      @play-workflow="vm.selectWorkflow"
      @play-plan="vm.selectPlan"
      @toggle-mute="vm.onToggleMute"
      @volume-change="vm.onVolumeChange"
    />
  </div>
</template>

<script setup lang="ts">
import RunViewHeader from "./run-view/RunViewHeader.vue";
import RunViewStepSidebar from "./run-view/RunViewStepSidebar.vue";
import RunViewPreviewPane from "./run-view/RunViewPreviewPane.vue";
import RunViewLogPane from "./run-view/RunViewLogPane.vue";
import RunViewFooter from "./run-view/RunViewFooter.vue";
import { useRunView, type RunViewProps } from "./run-view/use-run-view.ts";

const props = defineProps<RunViewProps>();
const vm = useRunView(props);
</script>

<style scoped>
.run-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.run-view__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}
</style>
