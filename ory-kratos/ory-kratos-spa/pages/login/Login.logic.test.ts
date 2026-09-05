import { describe, expect, it } from "vitest";
import {
  buildLoginFormData,
  buildLoginUpdateBodyFromFormData,
  credentialsFromLoginForm,
  destinationAfterLogin,
  resolveLoginBrowserReturnTo,
} from "./Login.logic.ts";

describe("resolveLoginBrowserReturnTo", () => {
  it("uses return_to query when present", () => {
    expect(resolveLoginBrowserReturnTo("https://app.example/after", "https://fallback/")).toBe(
      "https://app.example/after",
    );
  });

  it("trims return_to", () => {
    expect(resolveLoginBrowserReturnTo("  https://x/  ", "https://fallback/")).toBe("https://x/");
  });

  it("falls back when return_to is missing or blank", () => {
    expect(resolveLoginBrowserReturnTo(undefined, "https://recipes/")).toBe("https://recipes/");
    expect(resolveLoginBrowserReturnTo("", "https://recipes/")).toBe("https://recipes/");
    expect(resolveLoginBrowserReturnTo("   ", "https://recipes/")).toBe("https://recipes/");
    expect(resolveLoginBrowserReturnTo(123, "https://recipes/")).toBe("https://recipes/");
  });
});

describe("destinationAfterLogin", () => {
  it("prefers flow return_to when set", () => {
    expect(destinationAfterLogin("https://app.example/next", "https://recipes/")).toBe(
      "https://app.example/next",
    );
  });

  it("trims flow return_to", () => {
    expect(destinationAfterLogin("  https://x/  ", "https://recipes/")).toBe("https://x/");
  });

  it("falls back when return_to is empty", () => {
    expect(destinationAfterLogin(undefined, "https://recipes/")).toBe("https://recipes/");
    expect(destinationAfterLogin("", "https://recipes/")).toBe("https://recipes/");
  });
});

describe("credentialsFromLoginForm", () => {
  it("reads identifier and password", () => {
    const fd = new FormData();
    fd.set("identifier", "a@b.co");
    fd.set("password", "secret");
    expect(credentialsFromLoginForm(fd)).toEqual({
      identifier: "a@b.co",
      password: "secret",
    });
  });

  it("trims identifier and defaults password to empty string", () => {
    const fd = new FormData();
    fd.set("identifier", "  x@y.z  ");
    expect(credentialsFromLoginForm(fd)).toEqual({
      identifier: "x@y.z",
      password: "",
    });
  });
});

describe("buildLoginFormData", () => {
  it("merges a type=button submitter name/value (Vuetify) into FormData", () => {
    const form = document.createElement("form");
    const csrf = document.createElement("input");
    csrf.name = "csrf_token";
    csrf.value = "tok";
    form.appendChild(csrf);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.name = "method";
    btn.value = "code";
    form.appendChild(btn);
    const fd = buildLoginFormData(form, btn);
    expect(fd.get("csrf_token")).toBe("tok");
    expect(fd.get("method")).toBe("code");
  });
});

describe("buildLoginUpdateBodyFromFormData", () => {
  it("builds a password-method body", () => {
    const fd = new FormData();
    fd.set("method", "password");
    fd.set("csrf_token", "tok");
    fd.set("identifier", "  a@b.co  ");
    fd.set("password", "secret");
    expect(buildLoginUpdateBodyFromFormData(fd)).toEqual({
      method: "password",
      csrf_token: "tok",
      identifier: "a@b.co",
      password: "secret",
    });
  });

  it("builds a totp-method body", () => {
    const fd = new FormData();
    fd.set("method", "totp");
    fd.set("csrf_token", "tok");
    fd.set("totp_code", "123456");
    expect(buildLoginUpdateBodyFromFormData(fd)).toEqual({
      method: "totp",
      csrf_token: "tok",
      totp_code: "123456",
    });
  });

  it("builds a code-method body for email MFA (AAL2)", () => {
    const fd = new FormData();
    fd.set("method", "code");
    fd.set("csrf_token", "tok");
    fd.set("code", "123456");
    expect(buildLoginUpdateBodyFromFormData(fd)).toEqual({
      method: "code",
      csrf_token: "tok",
      code: "123456",
    });
  });

  it("infers code method when a code value is present without method", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("code", "654321");
    expect(buildLoginUpdateBodyFromFormData(fd)).toMatchObject({
      method: "code",
      code: "654321",
    });
  });

  it("infers code method for resend without a code value", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("resend", "email");
    expect(buildLoginUpdateBodyFromFormData(fd)).toMatchObject({
      method: "code",
      resend: "email",
    });
  });

  it("infers code method when submitting the address send-code control (MFA)", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("address", "user@example.com");
    expect(buildLoginUpdateBodyFromFormData(fd)).toMatchObject({
      method: "code",
      address: "user@example.com",
    });
  });

  it("throws when method is missing", () => {
    const fd = new FormData();
    expect(() => buildLoginUpdateBodyFromFormData(fd)).toThrow("Missing login method in form");
  });

  it("falls back to password method when password fields exist", () => {
    const fd = new FormData();
    fd.set("identifier", "a@b.co");
    fd.set("password", "secret");
    fd.set("csrf_token", "tok");
    expect(buildLoginUpdateBodyFromFormData(fd)).toEqual({
      method: "password",
      identifier: "a@b.co",
      password: "secret",
      csrf_token: "tok",
    });
  });

  it("infers passkey method when passkey_login is present", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("passkey_login", '{"id":"abc"}');
    expect(buildLoginUpdateBodyFromFormData(fd)).toMatchObject({
      method: "passkey",
      passkey_login: '{"id":"abc"}',
      csrf_token: "tok",
    });
  });

  it("uses passkey when passkey_login is set even if method and identifier look like password login", () => {
    const fd = new FormData();
    fd.set("method", "password");
    fd.set("csrf_token", "tok");
    fd.set("identifier", "a@b.co");
    fd.set("password", "");
    fd.set("passkey_login", '{"id":"cred"}');
    expect(buildLoginUpdateBodyFromFormData(fd)).toMatchObject({
      method: "passkey",
      identifier: "a@b.co",
      passkey_login: '{"id":"cred"}',
    });
  });
});
