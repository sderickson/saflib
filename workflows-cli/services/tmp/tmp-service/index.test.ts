import { expect, describe, it } from "vitest";
import * as mainExports from "tmp-service";

describe("tmp-service", () => {
  it("should be defined", () => {
    expect(mainExports).toBeDefined();
  });
});
