import { describe, expect, it } from "vitest";
import { normalizeTemplate, templateHash } from "./templates.ts";

describe("normalizeTemplate", () => {
  it.each([
    ["job 42 finished in 325ms", "job <n> finished in <n>ms"],
    ["user 3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b signed in", "user <uuid> signed in"],
    ["enqueued xK3p9QmZ2a for r-9", "enqueued <id> for r-<n>"],
    ['missing key "recipes.title" at 2026-11-08T10:00:00Z', 'missing key "<str>" at <time>'],
    ["failed for [redacted:email] from 203.0.113.0", "failed for <redacted> from <ip>"],
    ["commit 9c55208a done", "commit <hex> done"],
  ])("%j → %j", (input, expected) => {
    expect(normalizeTemplate(input)).toBe(expected);
  });

  it("groups lines that differ only by values", () => {
    const a = templateHash("svc", normalizeTemplate("job 1 took 5ms"));
    const b = templateHash("svc", normalizeTemplate("job 99 took 1200ms"));
    const c = templateHash("other", normalizeTemplate("job 1 took 5ms"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
