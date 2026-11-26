<template>
  <tr
    class="log-group"
    :class="{ 'log-group--error': group.errors > 0, 'log-group--open': open }"
    :aria-expanded="expandable ? open : undefined"
    :tabindex="expandable ? 0 : undefined"
    data-test="log-group"
    @click="toggle"
    @keydown.enter="toggle"
  >
    <td class="log-group__caret saf-admin-hide-xs" aria-hidden="true">{{ expandable ? (open ? "▾" : "▸") : "" }}</td>
    <td class="log-mono text-medium-emphasis text-no-wrap">
      <span class="saf-admin-hide-xs">{{ formatTime(group.first_ts) }}</span>
      <span class="saf-admin-only-xs">{{ formatClock(group.first_ts) }}</span>
    </td>
    <td class="log-group__who">
      <!-- Name on wide screens; just the avatar on phones. -->
      <template v-if="group.user_id">
        <span class="saf-admin-hide-xs"><UserRef :id="group.user_id" /></span>
        <span class="saf-admin-only-xs"><UserRef :id="group.user_id" variant="avatar" /></span>
      </template>
      <template v-else-if="actorKind">
        <span class="saf-admin-hide-xs"><ActorChip :kind="actorKind" /></span>
        <span class="saf-admin-only-xs"><ActorChip :kind="actorKind" icon-only /></span>
      </template>
    </td>
    <td class="log-group__status">
      <v-chip size="x-small" variant="tonal" :color="status.tone">{{ status.label }}</v-chip>
    </td>
    <td class="log-group__title-cell">
      <span class="d-flex align-center ga-2" style="min-width: 0">
        <v-chip size="x-small" label variant="tonal" class="flex-shrink-0" :color="groupKindColor(groupKindLabel(group))">{{ groupKindLabel(group) }}</v-chip>
        <span class="log-mono text-truncate">{{ groupTitle(group) }}</span>
        <v-chip v-if="group.request?.internal" size="x-small" variant="outlined" class="flex-shrink-0 saf-admin-hide-xs">internal</v-chip>
        <span v-if="group.count > 0 && group.kind" class="text-caption text-medium-emphasis text-no-wrap saf-admin-hide-xs">
          {{ group.count }} {{ group.count === 1 ? "log" : "logs" }}
        </span>
      </span>
    </td>
    <td class="log-mono text-no-wrap saf-admin-hide-xs">{{ groupDuration(group) }}</td>
  </tr>
  <tr v-if="open && expandable" class="log-group__lines-row">
    <td colspan="6">
      <div class="log-group__lines" :style="{ borderLeftColor: color }" data-test="log-group-lines">
        <!-- What the row leaves out: on phones, everything; on wide screens, the id. -->
        <div class="log-group__facts" data-test="log-group-id">
          <span class="saf-admin-only-xs">{{ groupDuration(group) }}</span>
          <v-chip v-if="group.request?.internal" size="x-small" variant="outlined" class="saf-admin-only-xs">internal</v-chip>
          <span v-if="group.user_id" class="saf-admin-only-xs"><UserRef :id="group.user_id" variant="compact" /></span>
          <ShortId v-if="group.context_id" :id="group.context_id" :prefix="contextPrefix(group.kind)" />
        </div>
        <v-progress-linear v-if="lines.isPending.value" indeterminate />
        <div v-for="line in lines.data.value ?? []" :key="line.id" class="log-line" data-test="log-line">
          <span class="log-mono text-medium-emphasis log-line__offset">{{ formatOffset(line.ts, group.first_ts) }}</span>
          <span class="log-line__level" :class="`text-${levelColor(line.level) ?? 'medium-emphasis'}`">{{ line.level }}</span>
          <span class="log-mono text-medium-emphasis text-truncate log-line__op">{{ line.operation_name ?? "" }}</span>
          <span class="log-mono log-line__message">
            <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
            {{ line.untrusted.message }}
            <v-chip v-if="line.redactions > 0" size="x-small" color="warning" class="ms-1">
              {{ line.redactions }} redacted
            </v-chip>
            <LogLineFields :fields="line.untrusted.fields" />
          </span>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import type { OpsLogGroupResponse } from "@saflib/ops-spec";
import { ShortId } from "@saflib/vue/components";
import { idColor } from "@saflib/vue";
import { ActorChip, UserRef } from "@saflib/ory-kratos-vue";
import { useLogGroupLines } from "../requests/queries.ts";
import LogLineFields from "./LogLineFields.vue";
import {
  contextPrefix,
  formatOffset,
  formatClock,
  formatTime,
  groupDuration,
  groupKindColor,
  groupKindLabel,
  groupStatus,
  groupTitle,
  levelColor,
  startsOpen,
} from "./log-format.ts";

const props = defineProps<{ group: OpsLogGroupResponse; live?: boolean }>();

const actorKind = computed(() =>
  props.group.kind === "cron" ? "cron" : props.group.kind === "process" || props.group.kind === "job" || props.group.kind === null ? "system" : null,
);

const expandable = computed(() => props.group.context_id !== null);
const open = ref(startsOpen(props.group));
const toggle = () => {
  if (expandable.value) open.value = !open.value;
};

const status = computed(() => groupStatus(props.group));
const color = computed(() => (props.group.context_id ? idColor(props.group.context_id) : "transparent"));

const contextId = computed(() => (open.value ? props.group.context_id : null));
const lines = useLogGroupLines(contextId, toRef(() => !!props.live));
</script>

<style scoped>
.log-group {
  cursor: default;
}
.log-group[tabindex] {
  cursor: pointer;
}
.log-group--error {
  background: rgba(var(--v-theme-error), 0.04);
}
.log-group__caret {
  width: 20px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.log-group__title-cell {
  max-width: 0;
  width: 100%;
}
.log-group__who {
  max-width: 200px;
}
/* Who and status take only what they need, so the request gets the rest. */
.log-group__who,
.log-group__status {
  width: 1%;
  white-space: nowrap;
}
.log-group__lines-row > td {
  padding-top: 0 !important;
  padding-bottom: 10px !important;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.log-group__lines {
  margin-left: 20px;
  border-left: 2px solid;
  padding-left: 12px;
}
.log-line {
  display: grid;
  grid-template-columns: 64px 48px minmax(0, 200px) minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  padding: 3px 0;
  font-size: 0.8125rem;
}
.log-line__level {
  font-size: 0.6875rem;
  font-weight: 600;
}
.log-line__message {
  white-space: pre-wrap;
  word-break: break-word;
}
.log-group__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-bottom: 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.log-group__facts:empty {
  display: none;
}
@media (max-width: 599px) {
  .log-group__lines {
    margin-left: 0;
    padding-left: 10px;
  }
  /* Offset, level and operation on one line; the message underneath. */
  .log-line {
    grid-template-columns: auto auto minmax(0, 1fr);
    gap: 2px 8px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  }
  .log-line:last-child {
    border-bottom: 0;
  }
  .log-line__message {
    grid-column: 1 / -1;
  }
  .log-group__title-cell .log-mono {
    font-size: 0.75rem;
  }
}
.log-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}
</style>
