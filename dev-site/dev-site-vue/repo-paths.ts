/** Join productRoot + package directory into a repo-relative path prefix. */
export function repoPathPrefix(
  productRoot: string | undefined,
  packageDirectory: string,
): string {
  const parts = [productRoot, packageDirectory]
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return parts.join("/");
}

/** Strip productRoot + package directory from a repo-relative file path. */
export function packageLocalFilePath(
  filePath: string,
  productRoot: string | undefined,
  packageDirectory: string,
): string {
  const prefix = repoPathPrefix(productRoot, packageDirectory);
  if (!prefix) return filePath;
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  if (filePath === prefix) return ".";
  if (filePath.startsWith(withSlash)) return filePath.slice(withSlash.length);
  // Fallback: directory alone (when paths weren't product-prefixed)
  const dir = packageDirectory.replace(/^\/+|\/+$/g, "");
  if (dir) {
    const d = dir.endsWith("/") ? dir : `${dir}/`;
    if (filePath.startsWith(d)) return filePath.slice(d.length);
  }
  return filePath;
}
