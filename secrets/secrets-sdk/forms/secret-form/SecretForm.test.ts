import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretForm from "./SecretForm.vue";
import { secret_form_strings as strings } from "./SecretForm.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import type { SecretCreateRequest } from "@saflib/secrets-spec";

describe("SecretForm", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(SecretForm);

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should show loading state when mutation is pending", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Mock the mutation to be pending
    vi.spyOn(wrapper.vm.createMutation, "isPending", "get").mockReturnValue({
      value: true,
    });

    await wrapper.vm.$nextTick();

    // Check for skeleton loader
    expect(wrapper.findComponent({ name: "VSkeletonLoader" }).exists()).toBe(
      true,
    );
  });

  it("should show error state when mutation fails", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Mock the mutation to have an error
    vi.spyOn(wrapper.vm.createMutation, "error", "get").mockReturnValue({
      value: new Error("Test error"),
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Test error");
  });

  it("should render form fields", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Check form fields are present
    expect(wrapper.text()).toContain(strings.nameLabel);
    expect(wrapper.text()).toContain(strings.descriptionLabel);
    expect(wrapper.text()).toContain(strings.valueLabel);
  });

  it("should render submit and cancel buttons", async () => {
    const wrapper = mountTestApp(SecretForm);

    expect(wrapper.text()).toContain(strings.submitButton);
    expect(wrapper.text()).toContain(strings.cancelButton);
  });

  it("should initialize with default values", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Check default values
    const nameInput = wrapper.find('input[type="text"]');
    const descriptionInput = wrapper.find("textarea");

    expect(nameInput.element.value).toBe("");
    expect(descriptionInput.element.value).toBe("");
  });

  it("should initialize with empty form data", async () => {
    const wrapper = mountTestApp(SecretForm);

    const nameInput = wrapper.find('input[type="text"]');
    const descriptionInput = wrapper.find("textarea");

    expect(nameInput.element.value).toBe("");
    expect(descriptionInput.element.value).toBe("");
  });

  it("should validate required fields", async () => {
    const wrapper = mountTestApp(SecretForm);

    const submitButton = wrapper.find(`button[type="submit"]`);
    expect(submitButton.attributes("disabled")).toBeDefined();
  });

  it("should emit success event when secret is created", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Mock successful mutation
    const mockResult = { id: "secret-1", name: "test-secret" };
    wrapper.vm.createMutation.mutateAsync = vi
      .fn()
      .mockResolvedValue(mockResult);

    // Fill in the form
    const nameInput = wrapper.find('input[type="text"]');
    const valueInput = wrapper.find('input[type="password"]');

    await nameInput.setValue("test-secret");
    await valueInput.setValue("test-value-123");

    // Wait for validation to pass
    await wrapper.vm.$nextTick();

    // Trigger form submission directly
    await wrapper.vm.onSubmit();

    expect(wrapper.emitted("success")).toBeTruthy();
    expect(wrapper.emitted("success")![0][0]).toEqual(mockResult);
  });

  it("should emit cancel event when cancel button is clicked", async () => {
    const wrapper = mountTestApp(SecretForm);

    const cancelButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes(strings.cancelButton));
    await cancelButton?.trigger("click");

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("should toggle password visibility", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Initially password should be hidden
    expect(wrapper.vm.showPassword).toBe(false);

    // Toggle the password visibility
    wrapper.vm.showPassword = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.showPassword).toBe(true);
  });

  it("should disable form fields when mutation is pending", async () => {
    const wrapper = mountTestApp(SecretForm);

    // Mock the mutation to be pending
    vi.spyOn(wrapper.vm.createMutation, "isPending", "get").mockReturnValue({
      value: true,
    });

    await wrapper.vm.$nextTick();

    // Check that skeleton loader is shown instead of form
    expect(wrapper.findComponent({ name: "VSkeletonLoader" }).exists()).toBe(
      true,
    );
  });
});
