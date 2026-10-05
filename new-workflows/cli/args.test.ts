import { describe, it, expect } from "vitest";
import { parseNamedArgs } from "./args.ts";
import type { WorkflowInputSchema } from "@saflib/new-workflows";

const schema: WorkflowInputSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    upload: { type: "boolean", default: false },
    count: { type: "number", default: 1 },
  },
  required: ["name"],
};

describe("parseNamedArgs", () => {
  it("parses --key=value strings", () => {
    expect(parseNamedArgs(["--name=example"], schema)).toEqual({
      name: "example",
      upload: false,
      count: 1,
    });
  });

  it("parses bare --flag as boolean true, and --no-flag as false", () => {
    expect(parseNamedArgs(["--name=x", "--upload"], schema)).toEqual({
      name: "x",
      upload: true,
      count: 1,
    });
    expect(parseNamedArgs(["--name=x", "--no-upload"], schema)).toEqual({
      name: "x",
      upload: false,
      count: 1,
    });
  });

  it("coerces numbers", () => {
    expect(parseNamedArgs(["--name=x", "--count=5"], schema)).toEqual({
      name: "x",
      upload: false,
      count: 5,
    });
  });

  it("fills in defaults when omitted", () => {
    expect(parseNamedArgs(["--name=x"], schema)).toEqual({
      name: "x",
      upload: false,
      count: 1,
    });
  });

  it("throws on missing required fields", () => {
    expect(() => parseNamedArgs([], schema)).toThrow(/Missing required/);
  });

  it("throws on unknown flags", () => {
    expect(() => parseNamedArgs(["--name=x", "--bogus=1"], schema)).toThrow(/Unknown argument/);
  });

  it("throws on positional (unnamed) args", () => {
    expect(() => parseNamedArgs(["example-value"], schema)).toThrow(/must be named/);
  });

  it("throws on a bad number", () => {
    expect(() => parseNamedArgs(["--name=x", "--count=abc"], schema)).toThrow(/expects a number/);
  });

  it("returns an empty object when there's no schema and no args", () => {
    expect(parseNamedArgs([], undefined)).toEqual({});
  });
});
