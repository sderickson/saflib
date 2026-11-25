import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertLogHygiene, errorLogFields, findLogHygieneViolations } from "./index.ts";

const saflibRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("findLogHygieneViolations", () => {
  it("flags whole error objects in fields and errors interpolated into messages", () => {
    const source = [
      'log.error("a", { err });',
      'log.warn("b", { id, err: e });',
      "log.error(`c: ${error}`);",
      'log.error("d", errorLogFields(err));',
      'log.info("e", { id, ...errorLogFields(err) });',
      'log.error("f", { err }); // log-hygiene-ok',
      "log.info(`g ${id} done`);",
    ].join("\n");
    expect(findLogHygieneViolations(source).map((v) => [v.line, v.rule])).toEqual([
      [1, "error-object-field"],
      [2, "error-object-field"],
      [3, "error-interpolation"],
    ]);
  });
});

describe("errorLogFields", () => {
  it("keeps name, code and message, nothing else attached to the error", () => {
    const err = Object.assign(new Error("insert failed"), { code: "SQLITE_BUSY", params: ["jane@example.com"] });
    expect(errorLogFields(err)).toEqual({ error_name: "Error", error_code: "SQLITE_BUSY", error_message: "insert failed" });
    expect(errorLogFields("boom")).toEqual({ error_name: "string", error_message: "boom" });
  });
});

describe("saflib log hygiene", () => {
  it("no saflib log call logs a whole error object", () => {
    assertLogHygiene(saflibRoot);
  });
});
