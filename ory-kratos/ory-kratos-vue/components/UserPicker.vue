<template>
  <v-autocomplete
    :model-value="modelValue ?? null"
    v-model:search="search"
    :items="items"
    item-value="id"
    item-title="title"
    :label="label"
    :loading="list.isFetching.value"
    no-filter
    clearable
    hide-no-data
    data-test="user-picker"
    @update:model-value="(id) => emit('update:modelValue', id ?? null)"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :title="item.title" :subtitle="item.subtitle">
        <template #prepend>
          <UserRef :id="item.id" variant="avatar" class="me-2" />
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
/**
 * Pick a user by name, email or id: the same search as the Users page,
 * a page of matches as you type. v-model is the user's id (or null).
 */
import { computed, ref, watch } from "vue";
import UserRef from "./UserRef.vue";
import { useIdentity, useListIdentities } from "../requests/identities.ts";

const props = withDefaults(defineProps<{ modelValue?: string | null; label?: string }>(), { label: "User" });
const emit = defineEmits<{ "update:modelValue": [id: string | null] }>();

const search = ref("");
const debounced = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, (s) => {
  clearTimeout(timer);
  timer = setTimeout(() => (debounced.value = s ?? ""), 250);
});

const list = useListIdentities(debounced);
// The picked user stays a choice even when the current search doesn't match them.
const selected = useIdentity(computed(() => props.modelValue ?? null));

type Item = { id: string; title: string; subtitle: string };
const toItem = (r: { id: string; name?: string | null; email?: string | null }): Item => ({
  id: r.id,
  title: r.name || r.email || r.id,
  subtitle: r.name && r.email ? r.email : "",
});
const items = computed<Item[]>(() => {
  const found = (list.data.value?.pages[0]?.identities ?? []).map(toItem);
  const current = selected.identity.value;
  if (current && !found.some((i) => i.id === current.id)) found.unshift(toItem(current));
  if (props.modelValue && !current && !found.some((i) => i.id === props.modelValue)) {
    found.unshift({ id: props.modelValue, title: props.modelValue, subtitle: "" });
  }
  return found;
});
</script>
