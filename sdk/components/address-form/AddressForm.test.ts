import { describe, it, expect } from "vitest";
import AddressForm from "./AddressForm.vue";
import type { Address } from "@saflib/openapi";
import { stubGlobals } from "@saflib/vue/testing";
import { mountTestApp } from "../../test-app.ts";

describe("AddressForm", () => {
  stubGlobals();
  const defaultProps = {
    modelValue: null,
    disabled: false,
  };

  it("renders all address fields", () => {
    const wrapper = mountTestApp(AddressForm, {
      props: defaultProps,
    });

    expect(wrapper.find('input[placeholder*="street address"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('input[placeholder*="city or town"]').exists()).toBe(
      true,
    );
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

    const wrapper = mountTestApp(AddressForm, {
      props: {
        ...defaultProps,
        modelValue: address,
      },
    });

    expect(
      (
        wrapper.find('input[placeholder*="street address"]')
          .element as HTMLInputElement
      ).value,
    ).toBe(address.street_address);
    expect(
      (
        wrapper.find('input[placeholder*="city or town"]')
          .element as HTMLInputElement
      ).value,
    ).toBe(address.locality);
  });

  it("updates input values when form data changes", async () => {
    const wrapper = mountTestApp(AddressForm, {
      props: defaultProps,
    });

    const streetInput = wrapper.find('input[placeholder*="street address"]');
    await streetInput.setValue("123 Main St");
    expect((streetInput.element as HTMLInputElement).value).toBe("123 Main St");
  });
});
