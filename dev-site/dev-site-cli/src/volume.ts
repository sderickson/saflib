import path from "node:path";

/** Small image used only to copy files in and out of named volumes. */
export const VOLUME_COPY_IMAGE = "alpine:3.20";

/** `docker run` argv that copies a host directory into a named volume. */
export function volumeImportArgv(volume: string, hostDir: string): string[] {
  return [
    "run",
    "--rm",
    "-v",
    `${path.resolve(hostDir)}:/from:ro`,
    "-v",
    `${volume}:/to`,
    VOLUME_COPY_IMAGE,
    "sh",
    "-c",
    // Drop the .gitkeep placeholder that keeps an empty data dir in git, and make
    // the copy writable by any user: services run as their own non-root users
    // (e.g. Kratos), and this copy runs as root. Dev data only.
    "cp -a /from/. /to/ && rm -f /to/.gitkeep && chmod -R a+rwX /to",
  ];
}

/** `docker run` argv that copies a named volume's contents into a host directory. */
export function volumeExportArgv(volume: string, hostDir: string): string[] {
  return [
    "run",
    "--rm",
    "-v",
    `${volume}:/from:ro`,
    "-v",
    `${path.resolve(hostDir)}:/to`,
    VOLUME_COPY_IMAGE,
    "sh",
    "-c",
    "cp -a /from/. /to/",
  ];
}

/** `docker run` argv that prints the entries in a named volume, one per line. */
export function volumeListArgv(volume: string): string[] {
  return ["run", "--rm", "-v", `${volume}:/v:ro`, VOLUME_COPY_IMAGE, "ls", "-A", "/v"];
}
