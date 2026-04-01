import type { Session, SettingsFlow } from "@ory/client";
import { describe, expect, it } from "vitest";
import {
  buildSettingsUpdateBodyFromFormData,
  settingsFlowHasPasswordRecoveryMessage,
  settingsFlowShouldFetch,
  settingsNodesForGroup,
} from "./Settings.logic.ts";

describe("settingsFlowShouldFetch", () => {
  it("returns false while the session query is pending", () => {
    expect(settingsFlowShouldFetch(true, undefined)).toBe(false);
  });

  it("returns false when there is no session", () => {
    expect(settingsFlowShouldFetch(false, null)).toBe(false);
  });

  it("returns true when the session is loaded", () => {
    expect(settingsFlowShouldFetch(false, { id: "s" } as Session)).toBe(true);
  });
});

describe("buildSettingsUpdateBodyFromFormData", () => {
  it("builds a profile-method body with traits from FormData", () => {
    const fd = new FormData();
    fd.set("method", "profile");
    fd.set("csrf_token", "tok");
    fd.set("traits.email", "  a@b.co ");
    expect(buildSettingsUpdateBodyFromFormData(fd)).toEqual({
      method: "profile",
      csrf_token: "tok",
      traits: { email: "a@b.co" },
    });
  });

  it("builds a password-method body", () => {
    const fd = new FormData();
    fd.set("method", "password");
    fd.set("csrf_token", "tok");
    fd.set("password", "secret123");
    expect(buildSettingsUpdateBodyFromFormData(fd)).toEqual({
      method: "password",
      csrf_token: "tok",
      password: "secret123",
    });
  });

  it("builds a totp-method body", () => {
    const fd = new FormData();
    fd.set("method", "totp");
    fd.set("csrf_token", "tok");
    fd.set("totp_code", "123456");
    expect(buildSettingsUpdateBodyFromFormData(fd)).toEqual({
      method: "totp",
      csrf_token: "tok",
      totp_code: "123456",
    });
  });

  it("throws when the method is missing", () => {
    const fd = new FormData();
    expect(() => buildSettingsUpdateBodyFromFormData(fd)).toThrow("Unsupported settings method in form");
  });

  it("infers totp method when totp_unlink submit is present (unlink has no name=method field)", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("totp_unlink", "true");
    expect(buildSettingsUpdateBodyFromFormData(fd)).toEqual({
      method: "totp",
      csrf_token: "tok",
      totp_unlink: "true",
    });
  });

  it("infers passkey method when only passkey_remove is set (remove credential submit)", () => {
    const fd = new FormData();
    fd.set("csrf_token", "tok");
    fd.set("passkey_remove", "cred-id-123");
    expect(buildSettingsUpdateBodyFromFormData(fd)).toEqual({
      method: "passkey",
      csrf_token: "tok",
      passkey_remove: "cred-id-123",
    });
  });
});

describe("settingsNodesForGroup", () => {
  it("includes CSRF, method, and matching group nodes", () => {
    const flow = {
      ui: {
        nodes: [
          {
            type: "input",
            group: "default",
            attributes: { node_type: "input", name: "csrf_token", type: "hidden", value: "c" },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "default",
            attributes: { node_type: "input", name: "method", type: "hidden", value: "profile" },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "profile",
            attributes: { node_type: "input", name: "traits.email", type: "email" },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "password",
            attributes: { node_type: "input", name: "password", type: "password" },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "totp",
            attributes: { node_type: "input", name: "totp_code", type: "text" },
            meta: {},
            messages: [],
          },
          {
            type: "img",
            group: "totp",
            attributes: { id: "totp_qr", src: "data:image/png;base64,abc" },
            meta: {},
            messages: [],
          },
        ],
      },
    } as unknown as SettingsFlow;
    const profile = settingsNodesForGroup(flow, "profile");
    expect(profile.map((n) => (n.attributes as { name?: string }).name)).toEqual([
      "csrf_token",
      "method",
      "traits.email",
    ]);
    const password = settingsNodesForGroup(flow, "password");
    expect(password.map((n) => (n.attributes as { name?: string }).name)).toEqual([
      "csrf_token",
      "method",
      "password",
    ]);
    const totp = settingsNodesForGroup(flow, "totp");
    expect(totp.map((n) => (n.attributes as { name?: string }).name)).toEqual([
      "csrf_token",
      "method",
      "totp_code",
      undefined,
    ]);
  });

  it("includes default-group webauthn.js script for passkey group so Ory hooks load", () => {
    const flow = {
      ui: {
        nodes: [
          {
            type: "input",
            group: "default",
            attributes: { node_type: "input", name: "csrf_token", type: "hidden", value: "c" },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "default",
            attributes: { node_type: "input", name: "method", type: "hidden", value: "passkey" },
            meta: {},
            messages: [],
          },
          {
            type: "script",
            group: "webauthn",
            attributes: {
              src: "http://kratos.docker.localhost/.well-known/ory/webauthn.js",
              async: true,
              referrerpolicy: "no-referrer",
              crossorigin: "anonymous",
              integrity: "sha512-test",
              type: "text/javascript",
              id: "webauthn_script",
              nonce: "n",
              node_type: "script",
            },
            meta: {},
            messages: [],
          },
          {
            type: "input",
            group: "passkey",
            attributes: {
              node_type: "input",
              name: "passkey_settings_register",
              type: "hidden",
              value: "",
            },
            meta: {},
            messages: [],
          },
        ],
      },
    } as unknown as SettingsFlow;
    const passkey = settingsNodesForGroup(flow, "passkey");
    expect(passkey.map((n) => n.type)).toEqual(["input", "input", "script", "input"]);
    expect((passkey[2]!.attributes as { src?: string }).src).toContain("webauthn.js");
  });
});

describe("settingsFlowHasPasswordRecoveryMessage", () => {
  it("detects Kratos message id 1060001 (post-recovery password prompt)", () => {
    const flow = {
      ui: {
        messages: [{ id: 1060001, type: "info" as const, text: "Original Kratos copy" }],
      },
    } as SettingsFlow;
    expect(settingsFlowHasPasswordRecoveryMessage(flow)).toBe(true);
  });

  it("returns false when that message is absent", () => {
    const flow = {
      ui: {
        messages: [{ id: 1060002, type: "info" as const, text: "Other" }],
      },
    } as SettingsFlow;
    expect(settingsFlowHasPasswordRecoveryMessage(flow)).toBe(false);
  });
});
