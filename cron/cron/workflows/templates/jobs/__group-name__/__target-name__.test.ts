import { describe, it } from "vitest";

import {
  makeContext,
  __serviceName__ServiceStorage,
} from "template-package-service-common";
import { __serviceName__Db } from "template-package-db";
import { __targetName__ } from "./__target-name__.ts";

describe("RunScheduledCalls RPC", () => {
  it("should run the job", async () => {
    const context = makeContext();
    await __serviceName__ServiceStorage.run(context, async () => {
      await __targetName__();
    });
  });
});
