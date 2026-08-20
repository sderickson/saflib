import { describe, it, expect } from "vitest";
import { create__OffshootName__Router } from "./http.ts";

describe("@saflib/base-__offshoot-name__-http", () => {
  it("creates a router", () => {
    expect(create__OffshootName__Router()).toBeDefined();
  });
});
