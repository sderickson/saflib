import { describe, expect, it } from "vitest";
import { getSafContext, runWithActingUser, safContextStorage } from "./context.ts";

describe("runWithActingUser", () => {
  it("hydrates auth.userId for anonymous request context", async () => {
    await safContextStorage.run(
      {
        serviceName: "test",
        subsystemName: "http",
        operationName: "webhook",
      },
      async () => {
        expect(getSafContext().auth).toBeUndefined();

        await runWithActingUser("U_importer_owner", async () => {
          expect(getSafContext().auth?.userId).toBe("U_importer_owner");
        });

        expect(getSafContext().auth).toBeUndefined();
      },
    );
  });
});
