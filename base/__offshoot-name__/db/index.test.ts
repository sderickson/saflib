import { describe, it, expect } from "vitest";
import { __offshootName__Table } from "./schemas/__offshoot-name__.ts";

describe("@saflib/base-__offshoot-name__-db", () => {
  it("exports a seed table", () => {
    expect(__offshootName__Table).toBeDefined();
  });
});
