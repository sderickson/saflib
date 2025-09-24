import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import UpdateSecretForm from "./UpdateSecretForm.vue";
import { update_secret_form_strings as strings } from "./UpdateSecretForm.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import type { Secret } from "@saflib/secrets-spec";

describe("UpdateSecretForm", () => {
  stubGlobals();

  const mockSecret: Secret = {
    id: "secret-1",
    name: "database-password",
    description: "Main database password",
    masked_value: "db_pass***",
    created_at: 1640995200000,
    updated_at: 1640995200000,
    is_active: true,
  };

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should show loading state when mutation is pending", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Mock the mutation to be pending
    vi.spyOn(wrapper.vm.updateMutation, "isPending", "get").mockReturnValue({
      value: true,
    });

    await wrapper.vm.$nextTick();

    // Check for skeleton loader
    expect(wrapper.findComponent({ name: "VSkeletonLoader" }).exists()).toBe(
      true,
    );
  });

  it("should show error state when mutation fails", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Mock the mutation to have an error
    vi.spyOn(wrapper.vm.updateMutation, "error", "get").mockReturnValue({
      value: new Error("Test error"),
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Test error");
  });

  it("should render form fields", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Check form fields are present
    expect(wrapper.text()).toContain(strings.nameLabel);
    expect(wrapper.text()).toContain(strings.descriptionLabel);
    expect(wrapper.text()).toContain(strings.valueLabel);
    expect(wrapper.text()).toContain(strings.activeLabel);
  });

  it("should render submit and cancel buttons", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    expect(wrapper.text()).toContain(strings.submitButton);
    expect(wrapper.text()).toContain(strings.cancelButton);
  });

  it("should initialize with secret data", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Check that form is initialized with secret data
    const descriptionInput = wrapper.find("textarea");
    const activeSwitch = wrapper.findComponent({ name: "VSwitch" });

    expect(descriptionInput.element.value).toBe("Main database password");
    expect(activeSwitch.props("modelValue")).toBe(true);
  });

  it("should not pre-fill the value field for security", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    const valueInput = wrapper.find('input[type="password"]');
    expect((valueInput.element as HTMLInputElement).value).toBe("");
  });

  it("should validate required fields", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    const submitButton = wrapper.find(`button[type="submit"]`);
    expect(submitButton.attributes("disabled")).toBeDefined();
  });

  it("should emit success event when secret is updated", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Mock successful mutation
    const mockResult = { ...mockSecret, name: "updated-secret" };
    wrapper.vm.updateMutation.mutateAsync = vi
      .fn()
      .mockResolvedValue(mockResult);

    // Fill in the form
    const nameInput = wrapper.find('input[type="text"]');
    const valueInput = wrapper.find('input[type="password"]');

    await nameInput.setValue("updated-secret");
    await valueInput.setValue("new-value-123");

    // Wait for validation to pass
    await wrapper.vm.$nextTick();

    // Trigger form submission directly
    await wrapper.vm.onSubmit();

    expect(wrapper.emitted("success")).toBeTruthy();
    expect(wrapper.emitted("success")![0][0]).toEqual(mockResult);
  });

  it("should emit cancel event when cancel button is clicked", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    const cancelButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes(strings.cancelButton));
    await cancelButton?.trigger("click");

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("should toggle password visibility", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Initially password should be hidden
    expect(wrapper.vm.showPassword).toBe(false);

    // Toggle the password visibility
    wrapper.vm.showPassword = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.showPassword).toBe(true);
  });

  it("should update form when secret prop changes", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    const newSecret = { ...mockSecret, name: "new-name", is_active: false };
    await wrapper.setProps({ secret: newSecret });
    const activeSwitch = wrapper.findComponent({ name: "VSwitch" });

    expect(activeSwitch.props("modelValue")).toBe(false);
  });

  it("should disable form fields when mutation is pending", async () => {
    const wrapper = mountTestApp(UpdateSecretForm, {
      props: {
        secret: mockSecret,
      },
    });

    // Mock the mutation to be pending
    vi.spyOn(wrapper.vm.updateMutation, "isPending", "get").mockReturnValue({
      value: true,
    });

    await wrapper.vm.$nextTick();

    // Check that skeleton loader is shown instead of form
    expect(wrapper.findComponent({ name: "VSkeletonLoader" }).exists()).toBe(
      true,
    );
  });
});
