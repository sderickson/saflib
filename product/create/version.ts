export const MIN_NODE_MAJOR = 26;

export function assertNodeVersion(version = process.versions.node): void {
  const major = Number(version.split(".")[0]);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    throw new Error(
      `saf-create requires Node.js ${MIN_NODE_MAJOR}+ (current: ${version}).`,
    );
  }
}
