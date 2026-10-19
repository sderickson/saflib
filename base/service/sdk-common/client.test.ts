import { describe, expect, it } from "vitest";
import { createApiClient } from "./client.ts";

describe("createApiClient", () => {
  it("creates one client per getter, lazily", () => {
    const getClient = createApiClient<Record<string, never>>();
    expect(getClient()).toBe(getClient());
    expect(createApiClient<Record<string, never>>()()).not.toBe(getClient());
  });
});
