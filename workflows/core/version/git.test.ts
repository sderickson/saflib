import { describe, it, expect } from "vitest";
import { filterMatches } from "./git.ts";

describe("filterMatches", () => {
  it("filters out exact matches", () => {
    const absolutePaths = [
      "/path/to/file1.txt",
      "/path/to/file2.txt",
      "/path/to/file3.txt",
    ];
    const allowedAbsolutePaths = ["/path/to/file1.txt"];
    const filteredAbsolutePaths = filterMatches({
      absolutePaths,
      allowedAbsolutePaths,
      cwd: "/",
    });
    expect(filteredAbsolutePaths).toEqual([
      "/path/to/file2.txt",
      "/path/to/file3.txt",
    ]);
  });

  it("filters relative paths with globs", () => {
    const absolutePaths = [
      "/path/to/file1.txt",
      "/path/to/file2.txt",
      "/path/to/file3.txt",
    ];
    const filteredAbsolutePaths = filterMatches({
      absolutePaths,
      allowedAbsolutePaths: [],
      allowedGlobs: ["**/file1.txt"],
      cwd: "/",
    });
    expect(filteredAbsolutePaths).toEqual([
      "/path/to/file2.txt",
      "/path/to/file3.txt",
    ]);
  });

  it("filters out paths based on cwd and relative globs", () => {
    const absolutePaths = [
      "/path/to/subdir1/file1.txt",
      "/path/to/subdir1/file2.txt",
      "/path/to/subdir2/file3.txt",
    ];
    const filteredAbsolutePaths = filterMatches({
      absolutePaths,
      allowedAbsolutePaths: [],
      allowedGlobs: [
        "./subdir1/file*.txt", // This SHOULD match, based on cwd
        "./to/subdir2/file*.txt", // this should NOT match, based on cwd
      ],
      cwd: "/path/to",
    });
    expect(filteredAbsolutePaths).toEqual(["/path/to/subdir2/file3.txt"]);
  });

  it("filters out paths based on cwd and absolute globs", () => {
    const absolutePaths = [
      "/path/to/subdir1/file1.txt",
      "/path/to/subdir1/file2.txt",
      "/path/to/subdir2/file3.txt",
    ];
    const filteredAbsolutePaths = filterMatches({
      absolutePaths,
      allowedAbsolutePaths: [],
      allowedGlobs: ["**/subdir1/file*.txt"],
      cwd: "/path/to",
    });
    expect(filteredAbsolutePaths).toEqual(["/path/to/subdir2/file3.txt"]);
  });

  it("filters out universal globs", () => {
    const absolutePaths = [
      "/package-lock.json",
      "/package-lock.json.bak",
      "/path/to/package-lock.json",
      "/path/to/subdir/package-lock.json",
    ];
    const filteredAbsolutePaths = filterMatches({
      absolutePaths,
      allowedAbsolutePaths: [],
      cwd: "/path/to",
    });
    expect(filteredAbsolutePaths).toEqual(["/package-lock.json.bak"]);
  });
});
