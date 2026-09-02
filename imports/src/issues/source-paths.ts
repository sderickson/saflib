/**
 * Path classifiers shared by workdir package analysis (CLI + dev-site).
 */

/** `.ts` / `.tsx` / `.vue` sources parsed for exports and import graph edges. */
export function isGraphSourcePath(relPosix: string): boolean {
  return (
    (relPosix.endsWith(".ts") ||
      relPosix.endsWith(".tsx") ||
      relPosix.endsWith(".vue")) &&
    !relPosix.endsWith(".d.ts")
  );
}

/** Test / fixture / test-helper paths excluded from export inventory. */
export function isTestSourcePath(relPosix: string): boolean {
  const base = relPosix.split("/").pop() ?? relPosix;
  if (/\.(test|spec)\.(ts|tsx)$/.test(base)) return true;
  if (/\.test-helpers\.(ts|tsx)$/.test(base)) return true;
  if (/\.fixtures?\.(ts|tsx)$/.test(base)) return true;
  const parts = relPosix.split("/");
  return (
    parts.includes("test") ||
    parts.includes("testing") ||
    parts.includes("tests") ||
    parts.includes("fixtures") ||
    parts.includes("__tests__")
  );
}

/**
 * Workflow scaffold placeholders (`__target-name__.ts`, `handlers/__group-name__/`, …).
 */
export function isScaffoldTemplatePath(relPosix: string): boolean {
  return relPosix.split("/").some((part) => {
    const stem = part.replace(/\.[^.]+$/, "");
    return /^__[^/]+__$/.test(stem);
  });
}
