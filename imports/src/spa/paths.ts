import fs from "node:fs";
import path from "node:path";
import { readRootSafImportsConfig } from "../config/read-saf-imports-config.ts";

/** Repo-relative SPA client package directory, when configured and present. */
export function spaClientDir(root: string, spa: string): string | undefined {
  const clientsRoot = readRootSafImportsConfig(root).clientsRoot;
  if (!clientsRoot) return undefined;
  const relDir = path.join(clientsRoot, spa).replace(/\\/g, "/");
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return undefined;
  return relDir;
}

/** SPA keys from root `safImports.snapshot.bundles.spas`. */
export function listGateSpas(root: string): string[] {
  const spas = readRootSafImportsConfig(root).snapshot?.bundles?.spas;
  return spas ?? [];
}

export function resolveDevEnvPath(root: string): string | undefined {
  const rel = readRootSafImportsConfig(root).devEnvFile;
  return rel ? path.join(root, rel) : undefined;
}

export function resolveClientsBuildDir(root: string): string | undefined {
  const buildWorkspace = readRootSafImportsConfig(root).snapshot?.bundles
    ?.buildWorkspace;
  return buildWorkspace ? path.join(root, buildWorkspace) : undefined;
}

export function resolveClientsDistDir(root: string): string | undefined {
  const buildDir = resolveClientsBuildDir(root);
  return buildDir ? path.join(buildDir, "dist") : undefined;
}
