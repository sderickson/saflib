/** One declared secret for a package's `secrets.json`. */
export type SecretManifestEntry = {
  name: string;
  description: string;
};

/** Package-local list of secrets this package may fetch. */
export type SecretManifest = readonly SecretManifestEntry[];

/**
 * Returns true when `name` appears in the package secrets manifest.
 */
export function isSecretDeclared(
  name: string,
  packageSecrets: SecretManifest,
): boolean {
  return packageSecrets.some((entry) => entry.name === name);
}
