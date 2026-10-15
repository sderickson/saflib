<template>
  <footer class="run-view__foot">
    <div v-if="run?.status === 'awaiting_prompt'" class="mb-3">
      <em>Waiting on the agent.</em>
    </div>
    <div v-if="run?.status === 'awaiting_user'" class="mb-3">
      <em>{{ pauseMessage }}</em>
    </div>
    <v-alert
      v-if="run?.status === 'failed' && !isAdvancing"
      :type="wasCancelled ? 'info' : 'error'"
      :color="wasCancelled ? 'light-blue' : undefined"
      density="compact"
      variant="tonal"
      class="mb-3"
    >
      {{ wasCancelled ? "Stopped." : failureMessage }}
    </v-alert>

    <template v-if="run?.status === 'failed' && !isAdvancing">
      <v-textarea
        :model-value="extraPrompt"
        label="Guidance for the next attempt (optional)"
        placeholder="e.g. Use ignorePlural, the table name is already singular."
        rows="2"
        auto-grow
        density="compact"
        variant="outlined"
        class="mb-3"
        hide-details
        @update:model-value="emit('update:extraPrompt', $event)"
      />
      <div class="run-view__recovery-actions">
        <v-btn color="warning" variant="tonal" @click="emit('continue', { revert: true })">
          Revert &amp; Continue
        </v-btn>
        <v-btn variant="tonal" @click="emit('continue', { skip: true })">Skip Step</v-btn>
      </div>
      <div class="text-caption text-medium-emphasis mt-2">
        Continue (the play button below) re-runs this step as-is. Revert
        &amp; Continue discards <strong>all</strong> uncommitted changes
        in the repo first (not just this step's — see the docs before
        using on a shared checkout). Skip Step commits whatever's
        currently there and moves on without running this step.
      </div>
    </template>

    <v-textarea
      v-if="runId && messageOpen"
      ref="messageInput"
      :model-value="directMessage"
      :placeholder="agentMessageBlockedReason ? `${agentMessageBlockedReason} — wait to message the agent` : 'Message the agent — ⌘/Ctrl+Enter to send'"
      rows="1"
      auto-grow
      max-rows="8"
      density="compact"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      :disabled="Boolean(agentMessageBlockedReason)"
      :error-messages="agentMessageError"
      @update:model-value="emit('update:directMessage', $event)"
      @keydown.meta.enter.prevent="emit('send-direct')"
      @keydown.ctrl.enter.prevent="emit('send-direct')"
      @keydown.esc="messageOpen = false"
    >
      <template #append-inner>
        <v-btn
          icon="mdi-send"
          variant="text"
          size="small"
          density="comfortable"
          color="primary"
          :disabled="!directMessage.trim() || Boolean(agentMessageBlockedReason)"
          :loading="agentMessagePending"
          aria-label="Send to agent"
          title="Send to agent"
          @click="emit('send-direct')"
        />
      </template>
    </v-textarea>

    <div class="run-view__foot-actions">
      <div class="run-view__foot-actions-left">
        <v-btn
          v-if="!runId"
          color="primary"
          :loading="createPending"
          @click="emit('init')"
        >
          Init Workflow
        </v-btn>
        <template v-else>
          <v-btn-group
            density="comfortable"
            variant="tonal"
            divided
            :title="isOtherRunActive ? 'Another workflow is currently running' : undefined"
          >
            <v-btn
              icon="mdi-rewind"
              :disabled="isOtherRunActive || createPending"
              :loading="createPending"
              aria-label="Reset run"
              title="Reset — start a new run from the beginning"
              @click="emit('open-reset')"
            />
            <v-btn
              icon="mdi-stop"
              :color="isActiveRun && autoMode === 'stop' ? 'primary' : undefined"
              :loading="cancelPending"
              aria-label="Stop"
              title="Stop"
              @click="emit('stop')"
            />
            <v-btn
              icon="mdi-play"
              :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
              :color="isActiveRun && autoMode === 'step' ? 'primary' : undefined"
              aria-label="Play current step"
              title="Play current step"
              @click="emit('play-step')"
            />
            <v-btn
              icon="mdi-fast-forward"
              :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
              :color="isActiveRun && autoMode === 'workflow' ? 'primary' : undefined"
              aria-label="Play current workflow"
              title="Play current workflow"
              @click="emit('play-workflow')"
            />
            <v-btn
              icon="mdi-chevron-triple-right"
              :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
              :color="isActiveRun && autoMode === 'plan' ? 'primary' : undefined"
              aria-label="Play current plan"
              title="Play current plan"
              @click="emit('play-plan')"
            />
            <v-btn
              icon="mdi-chevron-double-up"
              :disabled="isAdvancing || isOtherRunActive || gotoPending"
              :loading="gotoPending"
              aria-label="Go to step"
              title="Go to step"
              @click="emit('open-goto')"
            />
          </v-btn-group>
          <v-btn
            icon="mdi-message-text-outline"
            density="comfortable"
            :variant="messageOpen ? 'flat' : 'tonal'"
            :color="messageOpen ? 'primary' : undefined"
            class="ml-2"
            aria-label="Message the agent"
            title="Message the agent (one turn — does not advance the workflow)"
            @click="toggleMessage"
          />
          <v-dialog :model-value="resetOpen" max-width="420" @update:model-value="emit('update:resetOpen', $event)">
            <v-card>
              <v-card-title class="text-body-1">Reset this run?</v-card-title>
              <v-card-text class="text-body-2">
                Starts a fresh run for this workflow from the beginning.
                The current run is kept in history
                <template v-if="isAdvancing && isActiveRun">
                  ; the in-progress step will be cancelled first
                </template>.
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="emit('update:resetOpen', false)">Cancel</v-btn>
                <v-btn color="primary" variant="tonal" @click="emit('confirm-reset')">Reset</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog :model-value="gotoOpen" max-width="560" @update:model-value="emit('update:gotoOpen', $event)">
            <v-card>
              <v-card-title class="text-body-1">Go to step</v-card-title>
              <v-card-text class="text-body-2">
                <p class="mb-3 text-medium-emphasis">
                  Click any step to seek there. Nested paths need a child
                  run already created (advance into the call-workflow first).
                </p>
                <p v-if="gotoTreeLoading" class="text-medium-emphasis mb-0">Loading step tree…</p>
                <p v-else-if="gotoTreeError" class="text-error mb-0">{{ gotoTreeError }}</p>
                <p v-else-if="gotoError" class="text-error mb-2">{{ gotoError }}</p>
                <ul v-else class="run-view__goto-tree">
                  <li
                    v-for="node in gotoTree"
                    :key="node.path"
                    class="run-view__goto-tree-row"
                    :class="{
                      'run-view__goto-tree-row--current': node.isCurrent,
                      'run-view__goto-tree-row--disabled': !node.runId,
                    }"
                    :style="{ paddingLeft: `${0.75 + node.depth * 1.1}rem` }"
                    :title="node.runId ? `Go to ${node.path}` : 'No nested run yet — advance into the parent call-workflow first'"
                    @click="node.runId && emit('goto-path', node.path)"
                  >
                    <span class="run-view__goto-tree-path">{{ node.path }}</span>
                    <span class="run-view__goto-tree-kind">{{ node.kind }}</span>
                    <span v-if="node.label" class="run-view__goto-tree-label">{{ node.label }}</span>
                    <span v-if="node.isCurrent" class="run-view__goto-tree-marker">current</span>
                  </li>
                </ul>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="emit('update:gotoOpen', false)">Close</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <span v-if="isOtherRunActive" class="text-body-2 text-medium-emphasis ml-3">
            Another workflow is currently running.
          </span>
        </template>
        <p v-if="createError" class="text-error ml-2 mb-0">{{ createError }}</p>
      </div>
      <div class="run-view__foot-actions-right">
        <v-btn
          icon
          variant="text"
          size="small"
          :aria-label="muted ? 'Unmute' : 'Mute'"
          :title="muted ? 'Unmute' : 'Mute'"
          @click="emit('toggle-mute')"
        >
          <v-icon :icon="volumeIcon" />
        </v-btn>
        <v-slider
          :model-value="volume"
          :disabled="muted"
          :min="0"
          :max="1"
          :step="0.05"
          hide-details
          density="compact"
          class="run-view__volume-slider"
          aria-label="Alert volume"
          @update:model-value="emit('volume-change', Number($event))"
        />
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { FlatStepTreeNode } from "./run-view.logic.ts";

defineProps<{
  runId?: string;
  run?: {
    status?: string;
  };
  pauseMessage: string;
  failureMessage: string;
  wasCancelled: boolean;
  isAdvancing: boolean;
  isOtherRunActive: boolean;
  isActiveRun: boolean;
  autoMode: string;
  extraPrompt: string;
  directMessage: string;
  agentMessagePending: boolean;
  agentMessageError?: string;
  /** Set while another agent turn is in flight anywhere; blocks sending. */
  agentMessageBlockedReason?: string;
  createPending: boolean;
  createError?: string;
  cancelPending: boolean;
  resetOpen: boolean;
  gotoOpen: boolean;
  gotoPending: boolean;
  gotoTreeLoading: boolean;
  gotoTreeError?: string;
  gotoError?: string;
  gotoTree: FlatStepTreeNode[];
  volume: number;
  muted: boolean;
  volumeIcon: string;
}>();

const emit = defineEmits<{
  init: [];
  continue: [options: { revert?: boolean; skip?: boolean }];
  "update:extraPrompt": [value: string];
  "update:directMessage": [value: string];
  "send-direct": [];
  "open-reset": [];
  "update:resetOpen": [value: boolean];
  "confirm-reset": [];
  "open-goto": [];
  "update:gotoOpen": [value: boolean];
  "goto-path": [path: string];
  stop: [];
  "play-step": [];
  "play-workflow": [];
  "play-plan": [];
  "toggle-mute": [];
  "volume-change": [value: number];
}>();

const messageOpen = ref(false);
const messageInput = ref<{ focus: () => void } | null>(null);

async function toggleMessage() {
  messageOpen.value = !messageOpen.value;
  if (messageOpen.value) {
    await nextTick();
    messageInput.value?.focus();
  }
}
</script>

<style scoped>
.run-view__foot {
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-view__recovery-actions {
  display: flex;
  gap: 0.5rem;
}
.run-view__foot-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.run-view__foot-actions-left,
.run-view__foot-actions-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.run-view__volume-slider {
  flex: 0 0 120px;
  width: 120px;
  margin-right: 0.5rem;
}
.run-view__goto-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
}
.run-view__goto-tree-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.run-view__goto-tree-row:last-child {
  border-bottom: none;
}
.run-view__goto-tree-row:hover:not(.run-view__goto-tree-row--disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
}
.run-view__goto-tree-row--current {
  background: rgba(var(--v-theme-warning), 0.14);
  font-weight: 600;
}
.run-view__goto-tree-row--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.run-view__goto-tree-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  opacity: 0.7;
  min-width: 2.5rem;
}
.run-view__goto-tree-kind {
  flex: 0 0 auto;
}
.run-view__goto-tree-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}
.run-view__goto-tree-marker {
  flex: 0 0 auto;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
}
</style>
