import { describe, expect, it } from "vitest";
import { effectiveMetricsConfig } from "../http.ts";

describe("effectiveMetricsConfig", () => {
  it("turns metrics off in development without a proxy URL", () => {
    expect(effectiveMetricsConfig({ app: "x" }, { DEPLOYMENT_NAME: "development" })).toBeUndefined();
  });
  it("keeps them with a proxy URL, or outside development", () => {
    expect(effectiveMetricsConfig({ app: "x" }, { DEPLOYMENT_NAME: "development", PROM_LABEL_PROXY_URL: "http://p" })).toEqual({ app: "x" });
    expect(effectiveMetricsConfig({ app: "x", proxyUrl: "http://p" }, { DEPLOYMENT_NAME: "development" })).toEqual({ app: "x", proxyUrl: "http://p" });
    expect(effectiveMetricsConfig({ app: "x" }, { DEPLOYMENT_NAME: "production" })).toEqual({ app: "x" });
    expect(effectiveMetricsConfig(undefined, {})).toBeUndefined();
  });
});
