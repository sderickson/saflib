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

// Format phone number for display (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);

  if (limitedDigits.length === 0) return "";
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

// Convert display format to E.164 format
const toE164 = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return "";
};

// Convert E.164 format to display format
const fromE164 = (value: string): string => {
  if (value.startsWith("+1") && value.length === 12) {
    return formatPhoneNumber(value.slice(2));
  }
  return "";
};

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
const phoneValidationRules = [
  (value: string) => {
    if (props.required && !value) {
      return "Phone number is required";
    }
    const e164 = toE164(value);
    if (!e164 || e164.length !== 12) {
      return "Please enter a valid 10-digit phone number";
    }
    return true;
  },
];

const computedRules = computed(() => {
  return [...phoneValidationRules, ...props.rules];
});
</script>
