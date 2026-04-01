import type { RecoveryFlow, Session } from "@ory/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildRecoveryUpdateBodyFromFormData,
  destinationAfterRecovery,
  formDataFromKratosRecoveryForm,
  recoveryFlowContinueWithUrl,
  recoveryFlowShouldFetch,
  resolveRecoveryBrowserRedirectUrl,
} from "./Recovery.logic.ts";

describe("recoveryFlowShouldFetch", () => {
  it("returns true when the route has a flow id (email link)", () => {
    expect(recoveryFlowShouldFetch(true, null, "flow-1")).toBe(true);
    expect(recoveryFlowShouldFetch(false, null, "flow-1")).toBe(true);
  });

  it("returns false while the session query is still pending and there is no flow id", () => {
    expect(recoveryFlowShouldFetch(true, undefined, undefined)).toBe(false);
  });

  it("returns false when the user is signed in and there is no flow id (browser recovery is for logged-out users)", () => {
    expect(recoveryFlowShouldFetch(false, { id: "s" } as Session, undefined)).toBe(false);
  });

  it("returns true when logged out, session loaded, and there is no flow id", () => {
    expect(recoveryFlowShouldFetch(false, null, undefined)).toBe(true);
  });
});

describe("destinationAfterRecovery", () => {
  it("prefers the flow return_to when set", () => {
    expect(destinationAfterRecovery("https://app.example/after", "https://fallback")).toBe(
      "https://app.example/after",
    );
  });

  it("uses the fallback when return_to is empty", () => {
    expect(destinationAfterRecovery("  ", "https://fallback")).toBe("https://fallback");
    expect(destinationAfterRecovery(undefined, "https://fallback")).toBe("https://fallback");
  });
});

describe("formDataFromKratosRecoveryForm", () => {
  it("includes method from the submit control (plain FormData omits it)", () => {
    const form = document.createElement("form");
    const email = document.createElement("input");
    email.name = "email";
    email.value = "a@b.com";
    form.appendChild(email);
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.name = "method";
    btn.value = "link";
    form.appendChild(btn);

    expect(new FormData(form).get("method")).toBeNull();
    expect(formDataFromKratosRecoveryForm(form, btn).get("method")).toBe("link");
  });

  it("fills method from the first named submit when submitter is missing", () => {
    const form = document.createElement("form");
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.name = "method";
    btn.value = "code";
    form.appendChild(btn);

    expect(formDataFromKratosRecoveryForm(form, null).get("method")).toBe("code");
  });
});

describe("buildRecoveryUpdateBodyFromFormData", () => {
  it("builds a link-method body from form data", () => {
    const fd = new FormData();
    fd.set("method", "link");
    fd.set("csrf_token", "csrf");
    fd.set("email", "  user@example.com  ");
    expect(buildRecoveryUpdateBodyFromFormData(fd)).toEqual({
      method: "link",
      csrf_token: "csrf",
      email: "user@example.com",
    });
  });

  it("builds a code-method body with optional fields", () => {
    const fd = new FormData();
    fd.set("method", "code");
    fd.set("csrf_token", "tok");
    fd.set("email", "a@b.co");
    fd.set("code", " 123456 ");
    expect(buildRecoveryUpdateBodyFromFormData(fd)).toMatchObject({
      method: "code",
      csrf_token: "tok",
      email: "a@b.co",
      code: "123456",
    });
  });

  it("throws when the method is not supported", () => {
    const fd = new FormData();
    fd.set("method", "password");
    expect(() => buildRecoveryUpdateBodyFromFormData(fd)).toThrow(
      "Unsupported recovery method in form",
    );
  });
});

describe("resolveRecoveryBrowserRedirectUrl", () => {
  it("prefixes path-only URLs with window.location.origin", () => {
    vi.stubGlobal("location", { origin: "http://auth.docker.localhost" });
    try {
      expect(resolveRecoveryBrowserRedirectUrl("/settings?flow=abc")).toBe(
        "http://auth.docker.localhost/settings?flow=abc",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("recoveryFlowContinueWithUrl", () => {
  it("returns redirect_browser_to when present", () => {
    const flow = {
      continue_with: [
        {
          action: "redirect_browser_to",
          redirect_browser_to: "https://next.example/after",
        },
      ],
    } as RecoveryFlow;
    expect(recoveryFlowContinueWithUrl(flow)).toBe("https://next.example/after");
  });

  it("resolves path-only redirect_browser_to against the current origin", () => {
    vi.stubGlobal("location", { origin: "http://auth.docker.localhost" });
    try {
      const flow = {
        continue_with: [
          {
            action: "redirect_browser_to",
            redirect_browser_to: "/settings?flow=sf-1",
          },
        ],
      } as RecoveryFlow;
      expect(recoveryFlowContinueWithUrl(flow)).toBe(
        "http://auth.docker.localhost/settings?flow=sf-1",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns show_settings_ui flow url when present", () => {
    const flow = {
      continue_with: [
        {
          action: "show_settings_ui",
          flow: { id: "sf", url: "https://auth.example/settings" },
        },
      ],
    } as RecoveryFlow;
    expect(recoveryFlowContinueWithUrl(flow)).toBe("https://auth.example/settings");
  });

  it("builds settings URL from flow id when Kratos omits flow.url", () => {
    const flow = {
      continue_with: [
        {
          action: "show_settings_ui",
          flow: { id: "settings-flow-99" },
        },
      ],
    } as RecoveryFlow;
    expect(
      recoveryFlowContinueWithUrl(flow, (id) => `https://auth.test/settings?flow=${id}`),
    ).toBe("https://auth.test/settings?flow=settings-flow-99");
  });

  it("returns null when there is no navigable continue_with entry", () => {
    expect(recoveryFlowContinueWithUrl({ continue_with: [] } as unknown as RecoveryFlow)).toBe(
      null,
    );
  });
});
