import { describe, it, expect } from "vitest";
import {
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  HubPage,
  CheckoutPage,
  BuildPage,
  commitHealth,
  classifyPackageKind,
  buildPackageTestTree,
  buildPackageDirTree,
} from "./index.ts";

describe("@saflib/dev-site-vue", () => {
  it("exports pages and helpers", () => {
    expect(TimelinePage).toBeDefined();
    expect(CommitDetailPage).toBeDefined();
    expect(ComparePage).toBeDefined();
    expect(HubPage).toBeDefined();
    expect(CheckoutPage).toBeDefined();
    expect(BuildPage).toBeDefined();
    expect(commitHealth).toBeDefined();
    expect(classifyPackageKind).toBeDefined();
    expect(buildPackageTestTree).toBeDefined();
    expect(buildPackageDirTree).toBeDefined();
  });
});
