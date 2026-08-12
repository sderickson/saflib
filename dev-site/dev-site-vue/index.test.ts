import { describe, it, expect } from "vitest";
import {
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  HubPage,
  CheckoutPage,
  PackageMapPage,
  BuildPage,
  commitHealth,
  classifyPackageKind,
  buildPackageTestTree,
} from "./index.ts";

describe("@saflib/dev-site-vue", () => {
  it("exports pages and helpers", () => {
    expect(TimelinePage).toBeDefined();
    expect(CommitDetailPage).toBeDefined();
    expect(ComparePage).toBeDefined();
    expect(HubPage).toBeDefined();
    expect(CheckoutPage).toBeDefined();
    expect(PackageMapPage).toBeDefined();
    expect(BuildPage).toBeDefined();
    expect(commitHealth).toBeDefined();
    expect(classifyPackageKind).toBeDefined();
    expect(buildPackageTestTree).toBeDefined();
  });
});
