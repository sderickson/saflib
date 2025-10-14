<template>
  <v-container class="address-form">
    <v-row>
      <v-col cols="12 py-0">
        <v-text-field
          v-model="streetAddress"
          :label="t(strings.addressStreetLabel)"
          :placeholder="t(strings.addressStreetPlaceholder)"
          v-bind="commonInputProps"
          :rules="[streetAddressRule]"
        />
      </v-col>
    </v-row>

    <v-row class="pa-0">
      <v-col cols="6 py-0">
        <v-text-field
          v-model="locality"
          :label="t(strings.addressLocalityLabel)"
          :placeholder="t(strings.addressLocalityPlaceholder)"
          v-bind="commonInputProps"
          :rules="[localityRule]"
        />
      </v-col>
      <v-col cols="6 py-0">
        <v-text-field
          v-model="region"
          :label="t(strings.addressRegionLabel)"
          :placeholder="t(strings.addressRegionPlaceholder)"
          v-bind="commonInputProps"
          :rules="[regionRule]"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="6 py-0">
        <v-text-field
          v-model="country"
          :label="t(strings.addressCountryLabel)"
          :placeholder="t(strings.addressCountryPlaceholder)"
          v-bind="commonInputProps"
          :rules="[countryRule]"
        />
      </v-col>
      <v-col cols="6 py-0">
        <v-text-field
          v-model="postalCode"
          :label="t(strings.addressPostalCodeLabel)"
          :placeholder="t(strings.addressPostalCodePlaceholder)"
          v-bind="commonInputProps"
          :rules="[postalCodeRule]"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { address_form_strings as strings } from "./AddressForm.strings.ts";
import type { Address } from "@saflib/openapi";
import { ref, computed, watch, onMounted } from "vue";

// Props
const props = defineProps<{
  modelValue?: Address | null;
  disabled?: boolean;
}>();

// Emits
const emit = defineEmits<{
  "update:modelValue": [value: Address | null];
}>();

// Common input props
const commonInputProps = computed(() => ({
  variant: "outlined" as const,
  class: "mb-4",
  disabled: props.disabled,
}));

// Form data refs
const streetAddress = ref<string | undefined>(
  props.modelValue?.street_address ?? undefined,
);
const locality = ref<string | undefined>(
  props.modelValue?.locality ?? undefined,
);
const region = ref<string | undefined>(props.modelValue?.region ?? undefined);
const country = ref<string | undefined>(props.modelValue?.country ?? undefined);
const postalCode = ref<string | undefined>(
  props.modelValue?.postal_code ?? undefined,
);

const streetAddressRule = (v: string | undefined) => {
  if (!v) return true;
  if (v.length > 200) return strings.addressStreetTooLong;
  return true;
};

const localityRule = (v: string | undefined) => {
  if (!v) return true;
  if (v.length > 100) return strings.addressLocalityTooLong;
  return true;
};

const regionRule = (v: string | undefined) => {
  if (!v) return true;
  if (v.length > 100) return strings.addressRegionTooLong;
  return true;
};

const countryRule = (v: string | undefined) => {
  if (!v) return true;
  if (v.length > 100) return strings.addressCountryTooLong;
  return true;
};

const postalCodeRule = (v: string | undefined) => {
  if (!v) return true;
  if (v.length > 20) return strings.addressPostalCodeTooLong;
  return true;
};

// Translation function (placeholder - should be injected from parent)
const t = (key: string) => key;

// Watch for changes and emit updates
watch(
  [streetAddress, locality, region, country, postalCode],
  () => {
    const hasAnyValue =
      streetAddress.value ||
      locality.value ||
      region.value ||
      country.value ||
      postalCode.value;

    if (hasAnyValue) {
      const address: Address = {
        formatted: null,
        street_address: streetAddress.value || null,
        locality: locality.value || null,
        region: region.value || null,
        country: country.value || null,
        postal_code: postalCode.value || null,
      };
      emit("update:modelValue", address);
    } else {
      emit("update:modelValue", null);
    }
  },
  { deep: true },
);

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      streetAddress.value = newValue.street_address ?? undefined;
      locality.value = newValue.locality ?? undefined;
      region.value = newValue.region ?? undefined;
      country.value = newValue.country ?? undefined;
      postalCode.value = newValue.postal_code ?? undefined;
    } else {
      streetAddress.value = undefined;
      locality.value = undefined;
      region.value = undefined;
      country.value = undefined;
      postalCode.value = undefined;
    }
  },
  { immediate: true },
);

// Emit initial value
onMounted(() => {
  const hasAnyValue =
    streetAddress.value ||
    locality.value ||
    region.value ||
    country.value ||
    postalCode.value;

  if (hasAnyValue) {
    const address: Address = {
      formatted: null,
      street_address: streetAddress.value || null,
      locality: locality.value || null,
      region: region.value || null,
      country: country.value || null,
      postal_code: postalCode.value || null,
    };
    emit("update:modelValue", address);
  } else {
    emit("update:modelValue", null);
  }
});
</script>

<style scoped>
.address-form {
  width: 100%;
}
</style>
