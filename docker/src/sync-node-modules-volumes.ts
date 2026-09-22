import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const STAMPS_FILENAME = "node-modules-volume-stamps.json";

/** Target path for image-seeded Linux node_modules (not runtime `/repo/node_modules`). */
export const APP_NODE_MODULES_TARGET = "/app/node_modules";

export type ComposeVolumeMount = {
  type?: string;
  source?: string;
  target?: string;
};

export type ComposeService = {
  image?: string;
  volumes?: ComposeVolumeMount[];
};

export type ComposeConfig = {
  name?: string;
  services?: Record<string, ComposeService>;
  volumes?: Record<string, { name?: string } | undefined>;
};

export type NodeModulesVolumeTarget = {
  serviceName: string;
  /** Compose volumes key, e.g. `monolith_node_modules`. */
  volumeKey: string;
  /** Absolute Docker volume name. */
  volumeName: string;
  /** Image name without tag — matches `.saf-docker/stage/<imageName>/`. */
  imageName: string;
};

export type VolumeSyncDecision = {
  target: NodeModulesVolumeTarget;
  stageHash: string;
  previousHash: string | undefined;
  action: "reuse" | "refresh";
  reason: "stamp-match" | "stamp-mismatch" | "no-stamp" | "volume-missing";
};

export type VolumeStamps = Record<string, string>;

export function stripImageTag(image: string): string {
  // Digests: name@sha256:... — treat as full name without digest for stage lookup.
  const withoutDigest = image.split("@")[0]!;
  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");
  if (lastColon > lastSlash) {
    return withoutDigest.slice(0, lastColon);
  }
  return withoutDigest;
}

/**
 * Find named volumes mounted at `/app/node_modules` (image-seeded). Skips
 * `/repo/node_modules` and bind mounts.
 */
export function findAppNodeModulesVolumes(
  config: ComposeConfig,
): NodeModulesVolumeTarget[] {
  const out: NodeModulesVolumeTarget[] = [];
  const services = config.services ?? {};
  const volumes = config.volumes ?? {};

  for (const [serviceName, service] of Object.entries(services)) {
    if (!service?.image || !service.volumes?.length) {
      continue;
    }
    for (const mount of service.volumes) {
      if (mount.type && mount.type !== "volume") {
        continue;
      }
      if (mount.target !== APP_NODE_MODULES_TARGET) {
        continue;
      }
      if (!mount.source) {
        continue;
      }
      const volumeDef = volumes[mount.source];
      const volumeName = volumeDef?.name ?? mount.source;
      out.push({
        serviceName,
        volumeKey: mount.source,
        volumeName,
        imageName: stripImageTag(service.image),
      });
    }
  }

  return out.sort((a, b) => a.volumeName.localeCompare(b.volumeName));
}

function listFilesRecursive(dir: string, baseDir: string): string[] {
  const entries = readdirSync(dir).sort();
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...listFilesRecursive(full, baseDir));
    } else if (st.isFile()) {
      files.push(path.relative(baseDir, full).split(path.sep).join("/"));
    }
  }
  return files;
}

/** Stable SHA-256 of all files under a saf-docker install stage directory. */
export function hashStageDirectory(stageDir: string): string {
  if (!existsSync(stageDir)) {
    throw new Error(
      `Install stage not found: ${stageDir} (run saf-docker generate first)`,
    );
  }
  const files = listFilesRecursive(stageDir, stageDir).sort();
  const hash = createHash("sha256");
  for (const rel of files) {
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(path.join(stageDir, rel)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function stageDirForImage(repoRoot: string, imageName: string): string {
  return path.join(repoRoot, ".saf-docker", "stage", imageName);
}

export function stampsPathForRepo(repoRoot: string): string {
  return path.join(repoRoot, ".saf-docker", STAMPS_FILENAME);
}

export function readVolumeStamps(repoRoot: string): VolumeStamps {
  const stampsPath = stampsPathForRepo(repoRoot);
  if (!existsSync(stampsPath)) {
    return {};
  }
  const raw = JSON.parse(readFileSync(stampsPath, "utf-8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: VolumeStamps = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

export function writeVolumeStamps(repoRoot: string, stamps: VolumeStamps): void {
  const stampsPath = stampsPathForRepo(repoRoot);
  mkdirSync(path.dirname(stampsPath), { recursive: true });
  writeFileSync(stampsPath, JSON.stringify(stamps, null, 2) + "\n");
}

export function decideVolumeSync(params: {
  target: NodeModulesVolumeTarget;
  stageHash: string;
  previousHash: string | undefined;
  volumeExists: boolean;
}): VolumeSyncDecision {
  const { target, stageHash, previousHash, volumeExists } = params;
  if (!volumeExists) {
    return {
      target,
      stageHash,
      previousHash,
      action: "refresh",
      reason: "volume-missing",
    };
  }
  if (previousHash === undefined) {
    return {
      target,
      stageHash,
      previousHash,
      action: "refresh",
      reason: "no-stamp",
    };
  }
  if (previousHash !== stageHash) {
    return {
      target,
      stageHash,
      previousHash,
      action: "refresh",
      reason: "stamp-mismatch",
    };
  }
  return {
    target,
    stageHash,
    previousHash,
    action: "reuse",
    reason: "stamp-match",
  };
}

export function planVolumeSyncs(params: {
  config: ComposeConfig;
  repoRoot: string;
  stamps: VolumeStamps;
  volumeExists: (volumeName: string) => boolean;
}): VolumeSyncDecision[] {
  const targets = findAppNodeModulesVolumes(params.config);
  return targets.map((target) => {
    const stageHash = hashStageDirectory(
      stageDirForImage(params.repoRoot, target.imageName),
    );
    return decideVolumeSync({
      target,
      stageHash,
      previousHash: params.stamps[target.volumeName],
      volumeExists: params.volumeExists(target.volumeName),
    });
  });
}
