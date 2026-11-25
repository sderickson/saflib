import { describe, expect, it } from "vitest";
import { throwError } from "@saflib/utils";
import {
  createRedactionIssueRecorder,
  issuesDb,
  listIssues,
  listOccurrences,
} from "./index.ts";

describe("createRedactionIssueRecorder", () => {
  it("records where a redaction hit and the value's shape, not the value", async () => {
    const dbKey = issuesDb.connect();
    const record = createRedactionIssueRecorder({
      getDbKey: () => dbKey,
      version: "v1",
    });
    record({
      detections: [
        {
          kind: "card",
          where: "fields.distinct_id",
          shape: "19 chars: digits, spaces",
        },
      ],
      templateHash: "abc",
      template: "Product event: x",
      serviceName: "svc",
      operationName: null,
    });
    const { issues } = await throwError(listIssues(dbKey, {}));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.title).toBe(
      "Log line leaks card (masked): Product event: x",
    );
    const occurrences = await throwError(listOccurrences(dbKey, issues[0]!.id));
    expect(occurrences[0]!.fields).toEqual({
      where: ["fields.distinct_id"],
      shapes: ["19 chars: digits, spaces"],
    });
  });
});
