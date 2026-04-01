import { describe, it, expect } from "vitest";
import type { LoginFlow, RegistrationFlow } from "@ory/client";
import {
  buildLoginPasswordBody,
  buildRegistrationPasswordBody,
  buildRegistrationUpdateBodyFromFormData,
  csrfTokenFromUiFlow,
  postRegistrationNavigationUrl,
  traitsEmailFromFormData,
} from "./Registration.logic.ts";

describe("postRegistrationNavigationUrl", () => {
  it("returns trimmed return_to when set", () => {
    expect(
      postRegistrationNavigationUrl({
        return_to: "  https://app.example/  ",
      } as RegistrationFlow),
    ).toBe("https://app.example/");
  });

  it("returns undefined when missing or blank", () => {
    expect(postRegistrationNavigationUrl({} as RegistrationFlow)).toBe(
      undefined,
    );
    expect(
      postRegistrationNavigationUrl({
        return_to: "  ",
      } as RegistrationFlow),
    ).toBe(undefined);
  });
});

describe("buildLoginPasswordBody", () => {
  it("uses CSRF from the login flow and password method", () => {
    const loginFlow = {
      ui: {
        nodes: [
          {
            type: "input",
            attributes: {
              node_type: "input",
              name: "csrf_token",
              value: "csrf-xyz",
            },
          },
        ],
      },
    } as LoginFlow;
    expect(
      buildLoginPasswordBody(loginFlow, "u@example.com", "secret"),
    ).toEqual({
      method: "password",
      csrf_token: "csrf-xyz",
      identifier: "u@example.com",
      password: "secret",
    });
  });
});

describe("csrfTokenFromUiFlow", () => {
  it("returns empty when no csrf node", () => {
    expect(
      csrfTokenFromUiFlow({
        ui: { nodes: [], action: "https://example.com", method: "POST" },
      } as unknown as LoginFlow),
    ).toBe("");
  });
});

describe("Registration.logic", () => {
  describe("traitsEmailFromFormData", () => {
    it("prefers traits.email", () => {
      const fd = new FormData();
      fd.set("traits.email", "  a@b.co  ");
      fd.set("email", "other@x.co");
      expect(traitsEmailFromFormData(fd)).toBe("a@b.co");
    });

    it("falls back to email and traits[email]", () => {
      const fd1 = new FormData();
      fd1.set("email", "one@test.dev");
      expect(traitsEmailFromFormData(fd1)).toBe("one@test.dev");

      const fd2 = new FormData();
      fd2.set("traits[email]", "two@test.dev");
      expect(traitsEmailFromFormData(fd2)).toBe("two@test.dev");
    });
  });

  describe("buildRegistrationPasswordBody", () => {
    it("builds password method payload from FormData", () => {
      const fd = new FormData();
      fd.set("csrf_token", "tok");
      fd.set("password", "secret");
      fd.set("traits.email", "u@example.com");
      expect(buildRegistrationPasswordBody(fd)).toEqual({
        method: "password",
        csrf_token: "tok",
        password: "secret",
        traits: { email: "u@example.com" },
      });
    });
  });

  describe("buildRegistrationUpdateBodyFromFormData", () => {
    it("defaults to password method for the email-first step", () => {
      const fd = new FormData();
      fd.set("csrf_token", "tok");
      fd.set("traits.email", "u@example.com");
      expect(buildRegistrationUpdateBodyFromFormData(fd)).toEqual({
        method: "password",
        csrf_token: "tok",
        password: "",
        traits: { email: "u@example.com" },
      });
    });

    it("builds passkey method payload when passkey_register is set", () => {
      const fd = new FormData();
      fd.set("method", "passkey");
      fd.set("csrf_token", "tok");
      fd.set("traits.email", "u@example.com");
      fd.set("passkey_register", '{"response":{}}');
      expect(buildRegistrationUpdateBodyFromFormData(fd)).toEqual({
        method: "passkey",
        csrf_token: "tok",
        passkey_register: '{"response":{}}',
        traits: { email: "u@example.com" },
      });
    });
  });
});
