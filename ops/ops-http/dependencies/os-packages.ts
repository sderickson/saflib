import { existsSync, readFileSync } from "node:fs";
import type { OsRelease } from "./runtime.ts";

/**
 * One installed OS source package. OSV indexes Debian by source package
 * (`openssl`, not `libssl3`), so binaries are folded into their source.
 */
export interface OsPackage {
  name: string;
  version: string;
}

/** Installed packages from dpkg's status file, by source package. */
export function parseDpkgStatus(raw: string): OsPackage[] {
  const bySource = new Map<string, string>();
  for (const stanza of raw.split(/\n\s*\n/)) {
    const fields: Record<string, string> = {};
    for (const line of stanza.split("\n")) {
      const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
      if (m) fields[m[1]!] = m[2]!;
    }
    if (!fields.Package || !fields.Version || !/\binstalled$/.test(fields.Status ?? "")) continue;
    // "Source: openssl" or "Source: glibc (2.36-9+deb12u4)" when the source version differs.
    const src = /^(\S+)(?:\s+\(([^)]+)\))?/.exec(fields.Source ?? "");
    const name = src?.[1] ?? fields.Package;
    const version = src?.[2] ?? fields.Version;
    if (!bySource.has(name)) bySource.set(name, version);
  }
  return [...bySource]
    .map(([name, version]) => ({ name, version }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** OSV's ecosystem for an OS release (`Debian:12`), or undefined if unsupported. */
export function osvEcosystem(os: OsRelease | null | undefined): string | undefined {
  if (os?.id === "debian") return `Debian:${os.versionId.split(".")[0]}`;
  return undefined;
}

/** The image's OS packages (Debian only for now); empty when unknown. */
export function readOsPackages(os: OsRelease | null, statusPath = "/var/lib/dpkg/status"): OsPackage[] {
  if (!osvEcosystem(os) || !existsSync(statusPath)) return [];
  return parseDpkgStatus(readFileSync(statusPath, "utf8"));
}
