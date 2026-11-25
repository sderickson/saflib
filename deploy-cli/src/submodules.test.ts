import { describe, expect, it } from "vitest";
import { parseSubmoduleStatus } from "./submodules.ts";

describe("parseSubmoduleStatus", () => {
  it("flags checkouts that differ from the recorded commit, missing ones and conflicts", () => {
    const output = [
      " 5204944851064dd6752434dc438929b6b1a02ab9 saflib (v1-2-g5204944)",
      "+44f803798b642964c9c61ea6436ca3209444a7b4 vendor/a (heads/main)",
      "-1111111111111111111111111111111111111111 vendor/b",
      "U2222222222222222222222222222222222222222 vendor/c",
      "",
    ].join("\n");
    expect(parseSubmoduleStatus(output)).toEqual([
      { path: "vendor/a", problem: "checkout" },
      { path: "vendor/b", problem: "missing" },
      { path: "vendor/c", problem: "conflict" },
    ]);
  });

  it("is quiet when everything matches", () => {
    expect(
      parseSubmoduleStatus(
        " 5204944851064dd6752434dc438929b6b1a02ab9 saflib (v1)\n",
      ),
    ).toEqual([]);
  });
});
