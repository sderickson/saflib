import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./parse-unified-diff.ts";

const SAMPLE = `diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 export const foo = 1;
+export const bar = 2;
 unchanged
`;

describe("parseUnifiedDiff", () => {
  it("parses a single-file unified diff", () => {
    const files = parseUnifiedDiff(SAMPLE);
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("src/foo.ts");
    expect(files[0]!.lines.map((l) => l.kind)).toEqual([
      "meta",
      "meta",
      "meta",
      "hunk",
      "ctx",
      "add",
      "ctx",
    ]);
    expect(files[0]!.lines.find((l) => l.kind === "add")?.text).toBe(
      "export const bar = 2;",
    );
  });
});
