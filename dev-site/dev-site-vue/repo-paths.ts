/** Join product_root + package directory into a repo-relative path prefix. */
export function repoPathPrefix(
  product_root: string | undefined,
  package_directory: string,
): string {
  const parts = [product_root, package_directory]
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return parts.join("/");
}

/** Strip product_root + package directory from a repo-relative file path. */
export function packageLocalFilePath(
  file_path: string,
  product_root: string | undefined,
  package_directory: string,
): string {
  const prefix = repoPathPrefix(product_root, package_directory);
  if (!prefix) return file_path;
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  if (file_path === prefix) return ".";
  if (file_path.startsWith(withSlash)) return file_path.slice(withSlash.length);
  // Fallback: directory alone (when paths weren't product-prefixed)
  const dir = package_directory.replace(/^\/+|\/+$/g, "");
  if (dir) {
    const d = dir.endsWith("/") ? dir : `${dir}/`;
    if (file_path.startsWith(d)) return file_path.slice(d.length);
  }
  return file_path;
}
