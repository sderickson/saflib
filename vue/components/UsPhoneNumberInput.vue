<template>
  <v-text-field
    v-model="displayValue"
    v-bind="$attrs"
    :rules="computedRules"
    :error-messages="errorMessages"
    @input="handleInput"
    @blur="handleBlur"
    @focus="handleFocus"
  >
    <template #prepend-inner>
      <span class="text-body-2 text-medium-emphasis mr-2">+1</span>
    </template>
  </v-text-field>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  formatPhoneNumber,
  toE164,
  fromE164,
  getPhoneValidationRules,
} from "./phone-utils.ts";

interface Props {
  modelValue?: string;
  rules?: Array<(value: string) => string | boolean>;
  required?: boolean;
  label?: string;
  placeholder?: string;
  errorMessages?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  rules: () => [],
  required: false,
  label: "Phone Number",
  placeholder: "(555) 123-4567",
  errorMessages: () => [],
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const displayValue = ref("");
const isFocused = ref(false);

// Handle input changes
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;

  // Only allow digits, parentheses, spaces, and hyphens
  const cleaned = value.replace(/[^\d\s()-]/g, "");

  const formatted = formatPhoneNumber(cleaned);
  displayValue.value = formatted;

  // Emit E.164 format
  const e164 = toE164(formatted);
  emit("update:modelValue", e164);
};

const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  isFocused.value = false;
};

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue !== toE164(displayValue.value)) {
      displayValue.value = fromE164(newValue);
    }
  },
  { immediate: true },
);

// Validation rules
const phoneValidationRules = getPhoneValidationRules(props.required);

const computedRules = computed(() => {
  return [...phoneValidationRules, ...props.rules];
});
</script>
