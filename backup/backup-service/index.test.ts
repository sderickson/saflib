import { expect, describe, it } from "vitest";
import * as mainExports from "backup-service";

describe("backup-service", () => {
  it("should be defined", () => {
    expect(mainExports).toBeDefined();
  });
});
