import { createHash } from "node:crypto";
import type { ExportKind } from "./schemas/exports.ts";

/** Canonical identity string for an export (must match diff key fields). */
export function exportIdentityKey(e: {
  packageName: string;
  filePath: string;
  name: string;
  kind: ExportKind | string;
}): string {
  return `${e.packageName}\0${e.filePath}\0${e.name}\0${e.kind}`;
}

/** Canonical identity string for a test case (must match diff key fields). */
export function testCaseIdentityKey(t: {
  packageName: string;
  filePath: string;
  fullName: string;
}): string {
  return `${t.packageName}\0${t.filePath}\0${t.fullName}`;
}

export function hashExportIdentity(e: {
  packageName: string;
  filePath: string;
  name: string;
  kind: ExportKind | string;
}): string {
  return createHash("sha256").update(exportIdentityKey(e)).digest("hex");
}

export function hashTestCaseIdentity(t: {
  packageName: string;
  filePath: string;
  fullName: string;
}): string {
  return createHash("sha256").update(testCaseIdentityKey(t)).digest("hex");
}
