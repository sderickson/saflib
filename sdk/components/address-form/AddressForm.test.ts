import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createVuetify } from "vuetify";
import AddressForm from "./AddressForm.vue";
import type { Address } from "@saflib/openapi";

// Mock the translation function
const mockT = vi.fn((key: string) => key);

// Mock Vue i18n
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: mockT,
  }),
}));

// Create Vuetify instance for testing
const vuetify = createVuetify();

describe("AddressForm", () => {
  const defaultProps = {
    modelValue: null,
    disabled: false,
  };

  it("renders all address fields", () => {
    const wrapper = mount(AddressForm, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    expect(wrapper.find('input[placeholder*="formatted address"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder*="street address"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder*="city or town"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder*="state or region"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder*="country"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder*="postal code"]').exists()).toBe(true);
  });

  it("initializes with provided address data", async () => {
    const address: Address = {
      formatted: "123 Main St, Anytown, ST 12345, USA",
      street_address: "123 Main St",
      locality: "Anytown",
      region: "ST",
      country: "USA",
      postal_code: "12345",
    };

    const wrapper = mount(AddressForm, {
      props: {
        ...defaultProps,
        modelValue: address,
      },
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    await nextTick();

    expect((wrapper.find('input[placeholder*="formatted address"]').element as HTMLInputElement).value).toBe(address.formatted);
    expect((wrapper.find('input[placeholder*="street address"]').element as HTMLInputElement).value).toBe(address.street_address);
    expect((wrapper.find('input[placeholder*="city or town"]').element as HTMLInputElement).value).toBe(address.locality);
    expect((wrapper.find('input[placeholder*="state or region"]').element as HTMLInputElement).value).toBe(address.region);
    expect((wrapper.find('input[placeholder*="country"]').element as HTMLInputElement).value).toBe(address.country);
    expect((wrapper.find('input[placeholder*="postal code"]').element as HTMLInputElement).value).toBe(address.postal_code);
  });

  it("updates input values when form data changes", async () => {
    const wrapper = mount(AddressForm, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    const streetInput = wrapper.find('input[placeholder*="street address"]');
    await streetInput.setValue("123 Main St");
    await nextTick();

    // Check that the input value was set
    expect((streetInput.element as HTMLInputElement).value).toBe("123 Main St");
  });

  it("handles clearing all fields", async () => {
    const address: Address = {
      formatted: "123 Main St, Anytown, ST 12345, USA",
      street_address: "123 Main St",
      locality: "Anytown",
      region: "ST",
      country: "USA",
      postal_code: "12345",
    };

    const wrapper = mount(AddressForm, {
      props: {
        ...defaultProps,
        modelValue: address,
      },
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    // Clear all fields
    const inputs = wrapper.findAll('input[type="text"]');
    for (const input of inputs) {
      await input.setValue("");
    }

    await nextTick();

    // Verify all fields are cleared
    inputs.forEach(input => {
      expect((input.element as HTMLInputElement).value).toBe("");
    });
  });

  it("applies disabled state to all inputs", () => {
    const wrapper = mount(AddressForm, {
      props: {
        ...defaultProps,
        disabled: true,
      },
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    const inputs = wrapper.findAll('input[type="text"]');
    inputs.forEach(input => {
      expect(input.attributes("disabled")).toBeDefined();
    });
  });

  it("accepts long input values", async () => {
    const wrapper = mount(AddressForm, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    // Test formatted address validation
    const formattedInput = wrapper.find('input[placeholder*="formatted address"]');
    await formattedInput.setValue("a".repeat(501)); // Too long
    await nextTick();

    // Check that the input value was set
    expect((formattedInput.element as HTMLInputElement).value).toBe("a".repeat(501));
  });

  it("handles partial address data", async () => {
    const partialAddress: Address = {
      formatted: null,
      street_address: "123 Main St",
      locality: "Anytown",
      region: null,
      country: "USA",
      postal_code: null,
    };

    const wrapper = mount(AddressForm, {
      props: {
        ...defaultProps,
        modelValue: partialAddress,
      },
      global: {
        plugins: [vuetify],
        mocks: {
          t: mockT,
        },
      },
    });

    await nextTick();

    expect((wrapper.find('input[placeholder*="street address"]').element as HTMLInputElement).value).toBe("123 Main St");
    expect((wrapper.find('input[placeholder*="city or town"]').element as HTMLInputElement).value).toBe("Anytown");
    expect((wrapper.find('input[placeholder*="country"]').element as HTMLInputElement).value).toBe("USA");
    expect((wrapper.find('input[placeholder*="formatted address"]').element as HTMLInputElement).value).toBe("");
    expect((wrapper.find('input[placeholder*="state or region"]').element as HTMLInputElement).value).toBe("");
    expect((wrapper.find('input[placeholder*="postal code"]').element as HTMLInputElement).value).toBe("");
  });
});