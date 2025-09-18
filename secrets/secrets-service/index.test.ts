import { expect, describe, it } from "vitest";
import * as mainExports from "@saflib/secrets-service";

describe("@saflib/secrets-service", () => {
  it("should be defined", () => {
    expect(mainExports).toBeDefined();
  });
});
