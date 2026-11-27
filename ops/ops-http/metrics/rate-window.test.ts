import { describe, expect, it } from "vitest";
import { widenRangeSelectors } from "./rate-window.ts";

describe("widenRangeSelectors", () => {
  it("widens windows shorter than the step plus a scrape", () => {
    expect(widenRangeSelectors('sum(rate(http_count{path!="x"}[5m])) * 60', 720)).toBe('sum(rate(http_count{path!="x"}[13m])) * 60');
  });

  it("leaves windows that already cover the step", () => {
    expect(widenRangeSelectors("rate(x[5m])", 180)).toBe("rate(x[5m])");
    expect(widenRangeSelectors("rate(x[1h])", 720)).toBe("rate(x[1h])");
  });

  it("widens every selector and skips subqueries", () => {
    expect(widenRangeSelectors("rate(a[1m]) / rate(b[30s]) + max_over_time(c[1h:5m])", 300)).toBe(
      "rate(a[6m]) / rate(b[6m]) + max_over_time(c[1h:5m])",
    );
  });
});
