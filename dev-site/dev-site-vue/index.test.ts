import { describe, it, expect } from "vitest";
import {
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  commitHealth,
} from "./index.ts";

describe("@saflib/dev-site-vue", () => {
  it("exports pages and health helper", () => {
    expect(TimelinePage).toBeDefined();
    expect(CommitDetailPage).toBeDefined();
    expect(ComparePage).toBeDefined();
    expect(commitHealth).toBeDefined();
  });
});
