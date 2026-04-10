import { describe, expect, it } from "vitest";
import {
  normalizeKratosTraitPathFromFormKey,
  traitsRecordFromFormData,
} from "./kratosTraitsFromFormData.ts";

describe("normalizeKratosTraitPathFromFormKey", () => {
  it("maps dotted and Kratos-escaped trait keys to the same logical path", () => {
    expect(normalizeKratosTraitPathFromFormKey("traits.email")).toBe("email");
    expect(normalizeKratosTraitPathFromFormKey("traits.name.first")).toBe(
      "name.first",
    );
    expect(normalizeKratosTraitPathFromFormKey("traits.name\\.first")).toBe(
      "name.first",
    );
  });
});

describe("traitsRecordFromFormData", () => {
  it("nests traits for plain and escaped dot keys", () => {
    const fd = new FormData();
    fd.set("traits.email", "a@b.co");
    fd.set("traits.name.first", "Pat");
    fd.set("traits.name.last", "Smith");
    expect(traitsRecordFromFormData(fd)).toEqual({
      email: "a@b.co",
      name: { first: "Pat", last: "Smith" },
    });
  });

  it("treats traits.name\\.first like traits.name.first", () => {
    const fd = new FormData();
    fd.set("traits.name\\.first", "Pat");
    fd.set("traits.name\\.last", "Smith");
    expect(traitsRecordFromFormData(fd)).toEqual({
      name: { first: "Pat", last: "Smith" },
    });
  });
});
