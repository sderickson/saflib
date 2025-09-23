import { expect, describe, it } from "vitest";
import * as mainExports from "example-service";

describe("example-service", () => {
  it("should be defined", () => {
    expect(mainExports).toBeDefined();
  });
});
