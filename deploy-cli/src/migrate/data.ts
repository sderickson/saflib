import { shellQuote } from "../remote.ts";

/**
 * Prefix for commands run over a plain `ssh host '<command>'` (not the
 * `bash -s` payload, whose stdin is taken): sudo unless already root.
 */
const AS_ROOT = 'S=$([ "$(id -u)" = 0 ] || echo "sudo -n");';

/** Streams `paths` (relative to `dir`) to stdout as a tar, owners kept numerically. */
export function tarCreateCommand(dir: string, paths: string[] = ["."]): string {
  return `${AS_ROOT} $S tar -C ${shellQuote(dir)} --numeric-owner -cpf - ${paths.map(shellQuote).join(" ")}`;
}

/** Unpacks a tar from stdin into `dir` (created if missing), owners kept. */
export function tarExtractCommand(dir: string): string {
  return `${AS_ROOT} $S mkdir -p ${shellQuote(dir)} && $S tar -C ${shellQuote(dir)} --numeric-owner -xpf -`;
}

/**
 * Lists `<sha256>  <path>` for every regular file under `dir`, sorted, so
 * the two hosts' copies can be compared line by line.
 */
export function checksumCommand(dir: string): string {
  return `${AS_ROOT} cd ${shellQuote(dir)} && $S find . -type f -print0 | LC_ALL=C sort -z | $S xargs -0 -r sha256sum`;
}

/** True if `dir` has no entries besides `lost+found`. */
export function isEmptyDirCommand(dir: string): string {
  return `${AS_ROOT} [ -z "$($S find ${shellQuote(dir)} -mindepth 1 -maxdepth 1 ! -name lost+found -print -quit)" ] && echo empty || echo not-empty`;
}

/** `name=uid:gid` pairs, e.g. `app=1000:1000 kratos=10000:10000`. */
export type DataOwners = Record<string, { uid: number; gid: number }>;

/** Parses `SAF_DATA_OWNERS` (space- or comma-separated `folder=uid:gid`). */
export function parseDataOwners(value: string | undefined): DataOwners {
  const owners: DataOwners = {};
  for (const entry of (value ?? "").split(/[\s,]+/).filter(Boolean)) {
    const match = entry.match(/^([^=/]+)=(\d+):(\d+)$/);
    if (!match) {
      throw new Error(
        `Bad SAF_DATA_OWNERS entry "${entry}" (expected folder=uid:gid)`,
      );
    }
    owners[match[1]] = { uid: Number(match[2]), gid: Number(match[3]) };
  }
  return owners;
}

/**
 * Python (run as root on the new host) that fixes ownership after the copy:
 * every entry under `dir` (not `dir` itself or `lost+found`) is shifted by
 * the userns-remap base (`dockremap` in /etc/subuid and /etc/subgid; 0 when
 * remapping is off), so each container sees the uid it saw before. Top-level
 * folders in `owners` are instead set to that container uid (shifted), for
 * containers that now run as a non-root `USER`. With `--dry-run` it prints
 * `uid:gid path` instead of changing anything.
 */
export function ownershipScript(dir: string, owners: DataOwners): string {
  return `import json, os, sys

root = ${JSON.stringify(dir)}
owners = json.loads(${JSON.stringify(JSON.stringify(owners))})
dry_run = "--dry-run" in sys.argv
base_override = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--base=")]

def remap_base(path):
    try:
        with open(path) as f:
            for line in f:
                parts = line.strip().split(":")
                if len(parts) == 3 and parts[0] == "dockremap":
                    return int(parts[1])
    except FileNotFoundError:
        pass
    return 0

if base_override:
    ubase, gbase = (int(x) for x in base_override[0].split(":"))
else:
    ubase, gbase = remap_base("/etc/subuid"), remap_base("/etc/subgid")

def target(rel, st):
    top = rel.split(os.sep, 1)[0]
    if top in owners:
        return ubase + owners[top]["uid"], gbase + owners[top]["gid"]
    return ubase + st.st_uid, gbase + st.st_gid

changed = 0
for name in sorted(os.listdir(root)):
    if name == "lost+found":
        continue
    top = os.path.join(root, name)
    paths = [top]
    if os.path.isdir(top) and not os.path.islink(top):
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames.sort()
            paths += [os.path.join(dirpath, n) for n in dirnames + sorted(filenames)]
    for path in paths:
        st = os.lstat(path)
        uid, gid = target(os.path.relpath(path, root), st)
        if dry_run:
            print(f"{uid}:{gid} {os.path.relpath(path, root)}")
        elif (uid, gid) != (st.st_uid, st.st_gid):
            os.lchown(path, uid, gid)
            changed += 1

if not dry_run:
    print(f"ownership: base {ubase}:{gbase}, {changed} entries changed")
`;
}
