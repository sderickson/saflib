import { describe, expect, it } from "vitest";
import {
  sanitizeTelemetryCookieHeader,
  sanitizeTelemetryCookieMap,
  sanitizeTelemetryEvent,
  TELEMETRY_FILTERED_VALUE,
} from "./telemetrySanitize.ts";

describe("sanitizeTelemetryCookieMap", () => {
  it("filters sensitive session cookies", () => {
    expect(
      sanitizeTelemetryCookieMap({
        _csrf_token: "[Filtered]",
        ory_kratos_session: "secret-session",
        pathclerk_currentOrgId: "Org1",
      }),
    ).toEqual({
      _csrf_token: "[Filtered]",
      ory_kratos_session: TELEMETRY_FILTERED_VALUE,
      pathclerk_currentOrgId: "Org1",
    });
  });
});

describe("sanitizeTelemetryCookieHeader", () => {
  it("filters sensitive cookies in a Cookie header string", () => {
    expect(
      sanitizeTelemetryCookieHeader(
        "ory_kratos_session=abc123; pathclerk.currentOrgId=Org1",
      ),
    ).toBe(
      `ory_kratos_session=${TELEMETRY_FILTERED_VALUE}; pathclerk.currentOrgId=Org1`,
    );
  });
});

describe("sanitizeTelemetryEvent", () => {
  it("scrubs request cookies and Vue propsData contexts", () => {
    const event = {
      request: {
        cookies: {
          ory_kratos_session: "secret",
        },
        headers: {
          cookie: "ory_kratos_session=secret",
        },
      },
      contexts: {
        vue: {
          componentName: "CommunicationsPage",
          propsData: { matterId: "Mt_secret" },
        },
      },
      extra: {
        propsData: { secret: true },
      },
    };

    expect(sanitizeTelemetryEvent(event)).toEqual({
      request: {
        cookies: {
          ory_kratos_session: TELEMETRY_FILTERED_VALUE,
        },
        headers: {
          cookie: `ory_kratos_session=${TELEMETRY_FILTERED_VALUE}`,
        },
      },
      contexts: {
        vue: {
          componentName: "CommunicationsPage",
        },
      },
      extra: {},
    });
  });
});
