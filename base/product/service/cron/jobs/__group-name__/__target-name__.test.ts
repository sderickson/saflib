import { describe, expect, it } from "vitest";

import { __targetName__Config } from "./__target-name__.ts";

describe("__targetName__ cron config", () => {
  it("declares an enqueue-only JobConfig", () => {
    expect(__targetName__Config.schedule).toBeTruthy();
    expect(__targetName__Config.enqueue.operationId).toBeTruthy();
    expect(
      "handler" in __targetName__Config,
      "JobConfig must not include a handler",
    ).toBe(false);
  });
});
