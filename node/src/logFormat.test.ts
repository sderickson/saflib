import { describe, expect, it } from "vitest";
import {
  formatCompactTimestamp,
  formatHttpAccessLine,
  formatHttpDurationMs,
  formatHttpMethod,
  formatHttpResponseSize,
  formatHttpStatus,
  HTTP_CHANNEL_CLIENT_PLAIN,
  HTTP_CHANNEL_INTERNAL_PLAIN,
  httpChannelIndicator,
} from "./logFormat.ts";

describe("formatCompactTimestamp", () => {
  it("formats as MM-DD HH:mm", () => {
    const ts = formatCompactTimestamp(new Date("2026-08-07T16:48:54.073Z"));
    expect(ts).toBe("08-07 16:48");
  });
});

describe("httpChannelIndicator", () => {
  it("uses asymmetric plain markers (heavy inbound vs light outbound)", () => {
    expect(httpChannelIndicator(false, false)).toBe(HTTP_CHANNEL_CLIENT_PLAIN);
    expect(httpChannelIndicator(true, false)).toBe(HTTP_CHANNEL_INTERNAL_PLAIN);
    expect(HTTP_CHANNEL_CLIENT_PLAIN).toBe("◀━━ ");
    expect(HTTP_CHANNEL_INTERNAL_PLAIN).toBe(" ──▷");
  });

  it("wraps markers in ANSI weight when enabled", () => {
    expect(httpChannelIndicator(false, true)).toBe(
      "\u001b[1m◀━━ \u001b[0m",
    );
    expect(httpChannelIndicator(true, true)).toBe(
      "\u001b[2m ──▷\u001b[0m",
    );
  });
});

describe("formatHttpStatus", () => {
  it("pads status codes and handles missing", () => {
    expect(formatHttpStatus(200)).toBe("200");
    expect(formatHttpStatus(404)).toBe("404");
    expect(formatHttpStatus(undefined)).toBe("---");
  });
});

describe("formatHttpDurationMs", () => {
  it("rounds to whole ms with fixed width", () => {
    expect(formatHttpDurationMs(12.934)).toBe("  13ms");
    expect(formatHttpDurationMs(325.053)).toBe(" 325ms");
    expect(formatHttpDurationMs(9999)).toBe("9999ms");
  });

  it("switches to seconds above 10s instead of truncating digits", () => {
    // Regression: slicing a 6-char window turned 72233ms into "2233ms".
    expect(formatHttpDurationMs(72233)).toBe(" 72.2s");
    expect(formatHttpDurationMs(10_000)).toBe(" 10.0s");
    expect(formatHttpDurationMs(99_950)).toBe("100.0s");
    expect(formatHttpDurationMs(150_000)).toBe("  150s");
  });

  it("switches to minutes for very long requests", () => {
    expect(formatHttpDurationMs(1_200_000)).toBe(" 20.0m");
  });
});

describe("formatHttpResponseSize", () => {
  it("shows bytes, kb, dash, and zero at fixed width", () => {
    expect(formatHttpResponseSize(93)).toBe("   93b");
    expect(formatHttpResponseSize(68479)).toBe("  67kb");
    expect(formatHttpResponseSize(0)).toBe("    0b");
    expect(formatHttpResponseSize(undefined)).toBe("     -");
  });
});

describe("formatHttpMethod", () => {
  it("pads methods to five characters", () => {
    expect(formatHttpMethod("GET")).toBe("GET  ");
    expect(formatHttpMethod("POST")).toBe("POST ");
    expect(formatHttpMethod("PATCH")).toBe("PATCH");
  });
});

describe("formatHttpAccessLine", () => {
  it("aligns fields before method and path", () => {
    const line = formatHttpAccessLine({
      internal: false,
      ansi: false,
      status: 200,
      durationMs: 325.053,
      sizeBytes: 68479,
      method: "POST",
      url: "/matter-resources/-9AWuD1z/extract-form-data",
      timestamp: new Date("2026-08-07T16:48:54.131Z"),
    });
    expect(line).toBe(
      "08-07 16:48 ◀━━  200  325ms   67kb POST  /matter-resources/-9AWuD1z/extract-form-data",
    );
  });

  it("aligns paths when size is missing vs byte count", () => {
    const withDash = formatHttpAccessLine({
      internal: false,
      ansi: false,
      status: 200,
      durationMs: 759,
      sizeBytes: undefined,
      method: "GET",
      url: "/forms/ce7mK5_G/field-positions",
      timestamp: new Date("2026-08-07T17:10:00.000Z"),
    });
    const withBytes = formatHttpAccessLine({
      internal: false,
      ansi: false,
      status: 200,
      durationMs: 15,
      sizeBytes: 300,
      method: "GET",
      url: "/user-configs/mine",
      timestamp: new Date("2026-08-07T17:10:00.000Z"),
    });
    const dashPathIndex = withDash.indexOf("/forms");
    const bytesPathIndex = withBytes.indexOf("/user-configs");
    expect(dashPathIndex).toBe(bytesPathIndex);
    expect(withDash).toBe(
      "08-07 17:10 ◀━━  200  759ms      - GET   /forms/ce7mK5_G/field-positions",
    );
    expect(withBytes).toBe(
      "08-07 17:10 ◀━━  200   15ms   300b GET   /user-configs/mine",
    );
  });

  it("marks internal socket traffic with the light outbound marker", () => {
    const line = formatHttpAccessLine({
      internal: true,
      ansi: false,
      status: 200,
      durationMs: 12.934,
      sizeBytes: 93,
      method: "POST",
      url: "/matter-resources/-9AWuD1z/extract-form-data",
      timestamp: new Date("2026-08-07T16:48:54.884Z"),
    });
    expect(line).toBe(
      "08-07 16:48  ──▷ 200   13ms    93b POST  /matter-resources/-9AWuD1z/extract-form-data",
    );
  });

  it("bolds slow durations and large (>=100kb) sizes when ANSI is enabled", () => {
    const moderate = formatHttpAccessLine({
      internal: false,
      ansi: true,
      status: 200,
      durationMs: 325.053,
      sizeBytes: 68479,
      method: "POST",
      url: "/matter-resources/-9AWuD1z/extract-form-data",
      timestamp: new Date("2026-08-07T16:48:54.131Z"),
    });
    expect(moderate).toBe(
      `08-07 16:48 \u001b[1m◀━━ \u001b[0m 200  325ms   67kb POST  /matter-resources/-9AWuD1z/extract-form-data`,
    );

    const large = formatHttpAccessLine({
      internal: false,
      ansi: true,
      status: 200,
      durationMs: 120,
      sizeBytes: 112551,
      method: "GET",
      url: "/matters/everything",
      timestamp: new Date("2026-08-07T16:48:54.131Z"),
    });
    expect(large).toBe(
      `08-07 16:48 \u001b[1m◀━━ \u001b[0m 200  120ms \u001b[1m 110kb\u001b[0m GET   /matters/everything`,
    );

    const slowLine = formatHttpAccessLine({
      internal: true,
      ansi: true,
      status: 200,
      durationMs: 600,
      sizeBytes: 93,
      method: "GET",
      url: "/matters/foo",
      timestamp: new Date("2026-08-07T16:48:54.884Z"),
    });
    expect(slowLine).toBe(
      `08-07 16:48 \u001b[2m ──▷\u001b[0m 200 \u001b[1m 600ms\u001b[0m    93b GET   /matters/foo`,
    );
  });
});
