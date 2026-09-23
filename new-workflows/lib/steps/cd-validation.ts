import path from "node:path";
import { existsSync } from "node:fs";

/**
 * In dry-run, CopyStepMachine records target paths in `copiedFiles` without creating
 * directories. Skip CD validation when `newCwd` is the package root those files
 * would land in.
 */
export function isPendingCopyPackageRoot(
  newCwd: string,
  copiedFiles: Record<string, string> | undefined,
): boolean {
  if (!copiedFiles || Object.keys(copiedFiles).length === 0) {
    return false;
  }

  const resolvedCwd = path.resolve(newCwd);
  const pendingPackageJson = path.join(resolvedCwd, "package.json");

  return Object.values(copiedFiles).some((filePath) => {
    const resolved = path.resolve(filePath);
    return (
      resolved === pendingPackageJson ||
      resolved.startsWith(resolvedCwd + path.sep)
    );
  });
}

export function validateCdTarget(
  newCwd: string,
  runMode: string,
  copiedFiles: Record<string, string> | undefined,
): void {
  const shouldValidate =
    runMode === "print" || runMode === "run" || runMode === "dry";

  if (!shouldValidate) {
    return;
  }

  const pendingCopyRoot =
    runMode === "dry" && isPendingCopyPackageRoot(newCwd, copiedFiles);

  if (!existsSync(newCwd)) {
    if (pendingCopyRoot) {
      return;
    }
    throw new Error(
      `Directory ${newCwd} does not exist. You should only cd into packages.`,
    );
  }

  const packagePath = path.join(newCwd, "package.json");
  if (!existsSync(packagePath)) {
    if (pendingCopyRoot) {
      return;
    }
    // phase-0-plan cds into the dated project folder under plans/notes,
    // which is a workflow folder, not an npm package.
    if (existsSync(path.join(newCwd, "phase-0-plan.workflow.yaml"))) {
      return;
    }
    throw new Error(
      `Package.json not found in ${newCwd}. You should only cd into packages.`,
    );
  }
}
