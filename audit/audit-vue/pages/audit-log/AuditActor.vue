<template>
  <span class="audit-actor">
    <ActorChip v-if="actor.kind !== 'user' && actor.kind !== 'none'" :kind="actor.kind" :label="actor.label" />
    <template v-else-if="actor.kind === 'user'">
      <!-- Just the avatar on phones; the name is on hover. -->
      <span class="saf-admin-hide-xs"><UserRef :id="actor.id" /></span>
      <span class="saf-admin-only-xs"><UserRef :id="actor.id" variant="avatar" /></span>
    </template>
    <span v-else class="text-medium-emphasis">—</span>
    <span v-if="row.on_behalf_of_user_id && row.on_behalf_of_user_id !== row.actor_user_id" class="audit-actor__for">
      <span class="text-medium-emphasis">for</span>
      <UserRef :id="row.on_behalf_of_user_id" variant="avatar" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AuditLog } from "@saflib/audit-spec/types";
import { ActorChip, UserRef } from "@saflib/ory-kratos-vue";
import { auditActor } from "./audit-actor.ts";

const props = defineProps<{
  row: Pick<AuditLog, "source" | "actor_user_id" | "auth_method" | "on_behalf_of_user_id">;
}>();
const actor = computed(() => auditActor(props.row));
</script>

<style scoped>
.audit-actor {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}
.audit-actor__for {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}
</style>
