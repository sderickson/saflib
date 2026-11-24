import { appendFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadDeployConfig, type DeployConfig } from "../config.ts";
import {
  readRemoteScript,
  runRemote,
  syncAssets,
  upScript,
} from "../remote.ts";
import {
  checksumCommand,
  isEmptyDirCommand,
  ownershipScript,
  parseDataOwners,
  tarCreateCommand,
  tarExtractCommand,
} from "./data.ts";
import { promoteTarget, writeTargetEnv } from "./env-files.ts";
import type { MigrateIO, MigrateState, Step } from "./runner.ts";
import {
  addressOf,
  runRemoteCapture,
  scanHostKeys,
  sshCapture,
  sshPipe,
} from "./ssh.ts";

/** Everything the steps do to the outside world. Swapped for fakes in tests. */
export interface MigrateOps {
  sshCapture(host: string, command: string, input?: string): Promise<string>;
  sshPipe(
    from: string,
    fromCommand: string,
    to: string,
    toCommand: string,
  ): Promise<void>;
  scanHostKeys(address: string): Promise<string[]>;
  runRemote(config: DeployConfig, script: string): Promise<void>;
  runRemoteCapture(config: DeployConfig, script: string): Promise<string>;
  syncAssets(config: DeployConfig): Promise<void>;
  /** Replaces `address`'s entries in ~/.ssh/known_hosts with `keys`. */
  trustHostKeys(address: string, keys: string[]): Promise<void>;
  fetchStatus(url: string): Promise<number>;
}

export const realOps: MigrateOps = {
  sshCapture,
  sshPipe,
  scanHostKeys,
  runRemote: (config, script) => runRemote(config, script),
  runRemoteCapture,
  syncAssets,
  trustHostKeys: async (address, keys) => {
    spawnSync("ssh-keygen", ["-R", address], { stdio: "ignore" });
    appendFileSync(
      path.join(homedir(), ".ssh", "known_hosts"),
      keys.map((k) => `${address} ${k}\n`).join(""),
    );
  },
  fetchStatus: async (url) => (await fetch(url, { redirect: "manual" })).status,
};

export interface MigrateContext {
  /** Deploy package directories, platform deploy first. */
  deployDirs: string[];
  /** Target the stack moves from (`undefined`: env.remote alone). */
  from?: string;
  to: string;
  /** Name the old host's values are kept under after promotion. */
  previousName: string;
  state: MigrateState;
  io: MigrateIO;
  ops: MigrateOps;
}

const fromConfigs = (ctx: MigrateContext) =>
  ctx.deployDirs.map((d) => loadDeployConfig(d, ctx.from));
const toConfigs = (ctx: MigrateContext) =>
  ctx.deployDirs.map((d) => loadDeployConfig(d, ctx.to));
/**
 * The one host every deploy points at. Host-level work (setup, the data copy,
 * the address move) runs once against it, so deploys on different hosts are
 * refused rather than half-migrated.
 */
function sharedHost(configs: DeployConfig[], which: string): string {
  const hosts = [...new Set(configs.map((c) => c.env.SSH_HOSTNAME))];
  if (hosts.length !== 1 || !hosts[0]) {
    throw new Error(
      `The deploys' ${which} SSH_HOSTNAME differ (${configs
        .map(
          (c) => `${relative(c.deployDir)}: ${c.env.SSH_HOSTNAME || "unset"}`,
        )
        .join(", ")}); migrate moves one host's whole stack at a time`,
    );
  }
  return hosts[0];
}
const oldHost = (ctx: MigrateContext) => sharedHost(fromConfigs(ctx), "old");
const newHost = (ctx: MigrateContext) => sharedHost(toConfigs(ctx), "new");
const relative = (dir: string) => path.relative(process.cwd(), dir) || ".";
const targetFlag = (target: string | undefined) =>
  target ? `--target ${target}` : "(no --target)";

/** A setting from the first deploy that has it (the platform deploy first). */
function setting(ctx: MigrateContext, key: string): string | undefined {
  for (const config of fromConfigs(ctx)) {
    if (config.env[key]) return config.env[key];
  }
  return undefined;
}

export function dataDir(ctx: MigrateContext): string {
  const dir = setting(ctx, "SAF_DATA_DIR");
  if (!dir) {
    throw new Error(
      "Set SAF_DATA_DIR (where the data disk is mounted) in the platform deploy's env.remote",
    );
  }
  return dir;
}

/** Checks the settings every run needs, so a mistake fails before step 1. */
export function preflight(ctx: MigrateContext): void {
  dataDir(ctx);
  oldHost(ctx);
}

/** The registry's host (`ghcr.io` for `ghcr.io/acme`), if one is set. */
const registryHost = (ctx: MigrateContext) =>
  toConfigs(ctx)[0].containerRegistry?.split("/")[0];

const platforms = (ctx: MigrateContext) =>
  setting(ctx, "SAF_DEPLOY_PLATFORMS") ?? "amd64";

const ARCH_NAMES: Record<string, string> = {
  x86_64: "amd64",
  aarch64: "arm64",
  arm64: "arm64",
};

function rollbackLines(ctx: MigrateContext, addressMoved: boolean): string[] {
  const from = targetFlag(ctx.from);
  return [
    "If something goes wrong from here, roll back:",
    ...(addressMoved ? ["  - move the static address back to the old VM"] : []),
    `  - in each deploy, \`saf-deploy up ${from}\` (platform deploy first).`,
    "  The old host's data is never modified.",
  ];
}

/** How to pick the data disk, then format it and mount it at `dir` for good. */
function mountCommands(dir: string): string[] {
  return [
    "  lsblk",
    "The data disk is the one whose SIZE matches the disk you added, with TYPE",
    "`disk`, no partitions under it and no MOUNTPOINTS. The boot disk is the one",
    "whose partitions hold / and /boot; `loop` entries are snaps. Then:",
    "  DISK=/dev/<name>   # e.g. /dev/nvme0n2 or /dev/sdb",
    "  sudo blkid $DISK   # must print nothing: no filesystem yet. Formatting erases it",
    "  sudo mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard $DISK",
    `  sudo mkdir -p '${dir}'`,
    `  echo "UUID=$(sudo blkid -s UUID -o value $DISK) ${dir} ext4 discard,defaults,nofail 0 2" | sudo tee -a /etc/fstab`,
    `  sudo systemctl daemon-reload && sudo mount '${dir}' && sudo chmod 755 '${dir}'`,
    "  findmnt " + dir + "   # shows the disk mounted there",
  ];
}

export function migrationSteps(): Step<MigrateContext>[] {
  return [
    {
      id: "machine",
      title: "Create the new machine",
      kind: "manual",
      describe: (ctx) => [
        "In your cloud console, create the VM:",
        "  - an Ubuntu LTS image (not an interim release: those reach end of life in 9 months)",
        `  - an architecture images are built for (SAF_DEPLOY_PLATFORMS: ${platforms(ctx)})`,
        "  - a separate, empty data disk, with a snapshot schedule",
        "  - HTTP and HTTPS allowed; the same service account as the old VM",
        "  - a temporary external address. The static address moves over during the window",
        "",
        "Add your SSH key to it, SSH in, and format and mount the data disk so it",
        "mounts again on every boot (the fstab line finds it by filesystem UUID, so",
        "device names changing between boots doesn't matter). Find it with:",
        ...mountCommands(dataDir(ctx)),
        "A later step checks the mount and its /etc/fstab entry.",
      ],
    },
    {
      id: "ssh",
      title: "Connect to the new machine",
      kind: "auto",
      describe: (ctx) => [
        "Checks SSH to the new machine, then writes the new target",
        `(env.remote.${ctx.to}) in each deploy: ${ctx.deployDirs.map(relative).join(", ")}.`,
      ],
      run: async (ctx) => {
        const { io, ops, state } = ctx;
        const host = await io.ask(
          "New machine's SSH address (user@address)",
          state.newHost,
        );
        if (!host) throw new Error("No address given");
        const info = await ops.sshCapture(
          host,
          'cat /etc/machine-id; uname -m; . /etc/os-release; echo "$PRETTY_NAME"',
        );
        const [machineId, arch, os] = info.trim().split("\n");
        const oldId = (
          await ops.sshCapture(oldHost(ctx), "cat /etc/machine-id")
        ).trim();
        if (machineId === oldId) {
          throw new Error(`${host} is the old machine`);
        }
        io.print(`Reached ${host}: ${os}, ${arch}.`);
        const archName = ARCH_NAMES[arch] ?? arch;
        if (!platforms(ctx).split(",").includes(archName)) {
          io.print(
            `⚠ Images are built for ${platforms(ctx)}, not ${archName}: add it to SAF_DEPLOY_PLATFORMS and push before staging.`,
          );
        }
        const remap = await io.ask(
          "Turn on Docker user-namespace remapping there? (y/n)",
          state.userNamespaces === false ? "n" : "y",
        );
        state.newHost = host;
        state.newMachineId = machineId;
        state.newHostKeys = await ops.scanHostKeys(addressOf(host));
        state.userNamespaces = !remap.toLowerCase().startsWith("n");
        for (const dir of ctx.deployDirs) {
          const file = writeTargetEnv(dir, ctx.to, {
            SSH_HOSTNAME: host,
            ...(state.userNamespaces ? { SAF_USERNS_REMAP: "1" } : {}),
          });
          io.print(`Wrote ${relative(file)}`);
        }
      },
    },
    {
      id: "disk",
      title: "Check the data disk",
      kind: "auto",
      describe: (ctx) => [
        `Checks the new machine's data disk is mounted at ${dataDir(ctx)}, from an`,
        "/etc/fstab entry so it mounts again after a reboot. If not, lists its disks",
        "and the commands from step 1.",
      ],
      run: async (ctx) => {
        const dir = dataDir(ctx);
        const status = await ctx.ops.sshCapture(
          newHost(ctx),
          `findmnt --mountpoint '${dir}' > /dev/null && echo mounted || echo missing; ` +
            `findmnt --fstab --mountpoint '${dir}' > /dev/null && echo fstab || echo no-fstab`,
        );
        const [mounted, fstab] = status.trim().split("\n");
        if (mounted === "mounted" && fstab === "fstab") {
          ctx.io.print(`${dir} is mounted, and listed in /etc/fstab.`);
          return;
        }
        if (mounted === "mounted") {
          ctx.io.print(
            `${dir} is mounted but not in /etc/fstab, so it won't come back after a reboot. On the new machine:`,
          );
          ctx.io.print(
            `  echo "UUID=$(findmnt -no UUID '${dir}') ${dir} ext4 discard,defaults,nofail 0 2" | sudo tee -a /etc/fstab`,
          );
          ctx.io.print("  sudo systemctl daemon-reload && sudo mount -a");
          throw new Error(`${dir} has no /etc/fstab entry`);
        }
        const disks = await ctx.ops.sshCapture(
          newHost(ctx),
          "lsblk -e 7 -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS",
        );
        ctx.io.print(`${dir} isn't mounted. Disks on the new machine:`);
        ctx.io.print(disks.trimEnd());
        ctx.io.print();
        for (const line of mountCommands(dir).slice(1)) ctx.io.print(line);
        throw new Error(`${dir} isn't mounted yet`);
      },
    },
    {
      id: "setup",
      title: "Set up the new machine",
      kind: "auto",
      describe: (ctx) => [
        `\`saf-deploy setup --target ${ctx.to}\`: Docker, daemon.json${ctx.state.userNamespaces ? " with user-namespace remapping" : ""},`,
        "automatic security updates.",
      ],
      run: async (ctx) => {
        await ctx.ops.runRemote(toConfigs(ctx)[0], readRemoteScript("setup"));
      },
    },
    {
      id: "registry",
      title: "Log in to the container registry",
      kind: "auto",
      describe: (ctx) => {
        const registry = registryHost(ctx);
        return [
          `Deploys run Docker as root on the host, so root needs a login to ${registry ?? "the registry"}`,
          "to pull private images. On the new machine:",
          ...(registry === "ghcr.io"
            ? [
                "  (GitHub: a classic personal access token with only read:packages; see",
                "  https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)",
              ]
            : []),
          `  sudo docker login ${registry ?? "<registry>"} -u <user> --password-stdin   # paste the token, Enter, Ctrl-D`,
          "Then this step checks root's Docker config has the login. Skip (s) if the images are public.",
        ];
      },
      run: async (ctx) => {
        const registry = registryHost(ctx);
        if (!registry) return;
        const found = await ctx.ops.sshCapture(
          newHost(ctx),
          `sudo -n grep -qF '"${registry}"' /root/.docker/config.json 2>/dev/null && echo yes || echo no`,
        );
        if (found.trim() !== "yes") {
          throw new Error(
            `root on the new machine isn't logged in to ${registry}`,
          );
        }
        ctx.io.print(`root is logged in to ${registry}.`);
      },
    },
    {
      id: "stage",
      title: "Stage the stack on the new machine",
      kind: "auto",
      describe: (ctx) => {
        const hostPaths = setting(ctx, "SAF_MIGRATE_HOST_PATHS");
        return [
          "For each deploy: sync remote-assets/ and pull its images. Nothing starts yet:",
          "a stack without its data would run jobs and request certificates.",
          ...(hostPaths
            ? [`Also copies host files from the old machine: ${hostPaths}`]
            : []),
          "Safe to do days ahead of the window.",
        ];
      },
      run: async (ctx) => {
        for (const config of toConfigs(ctx)) {
          ctx.io.print(`\n== ${relative(config.deployDir)}`);
          await ctx.ops.syncAssets(config);
          try {
            await ctx.ops.runRemote(config, readRemoteScript("pull"));
          } catch (error) {
            throw new Error(
              `Pulling images failed (${error instanceof Error ? error.message : error}). ` +
                "If an image has no build for the new machine's architecture, set SAF_DEPLOY_PLATFORMS " +
                "(e.g. amd64,arm64) in env.remote and `saf-deploy push`.",
            );
          }
        }
        const hostPaths = (setting(ctx, "SAF_MIGRATE_HOST_PATHS") ?? "")
          .split(/[\s,]+/)
          .filter(Boolean);
        for (const hostPath of hostPaths) {
          if (!path.isAbsolute(hostPath)) {
            throw new Error(
              `SAF_MIGRATE_HOST_PATHS entry ${hostPath} isn't absolute`,
            );
          }
          ctx.io.print(`Copying ${hostPath}…`);
          await ctx.ops.sshPipe(
            oldHost(ctx),
            tarCreateCommand("/", [hostPath.slice(1)]),
            newHost(ctx),
            tarExtractCommand("/"),
          );
        }
      },
    },
    {
      id: "window",
      title: "Begin the maintenance window",
      kind: "confirm",
      describe: () => [
        "From the next step, the product is down until the stack starts on the new",
        "machine (usually a few minutes). Continue when you're ready for that.",
      ],
    },
    {
      id: "stop-old",
      title: "Stop the old machine's stack",
      kind: "auto",
      describe: (ctx) => [
        `\`saf-deploy down ${targetFlag(ctx.from)}\` in each deploy, platform deploy last.`,
      ],
      rollback: (ctx) => rollbackLines(ctx, false),
      run: async (ctx) => {
        for (const config of [...fromConfigs(ctx)].reverse()) {
          ctx.io.print(`\n== ${relative(config.deployDir)}`);
          await ctx.ops.runRemote(config, readRemoteScript("down"));
        }
      },
    },
    {
      id: "copy",
      title: "Copy the data",
      kind: "auto",
      describe: (ctx) => {
        const owners = setting(ctx, "SAF_DATA_OWNERS");
        return [
          `Streams ${dataDir(ctx)} from the old machine to the new one (through this`,
          "machine), compares checksums of every file on both sides, then fixes owners",
          `on the new machine${ctx.state.userNamespaces ? " for user-namespace remapping" : ""}${owners ? ` (and sets ${owners})` : ""}.`,
        ];
      },
      rollback: (ctx) => rollbackLines(ctx, false),
      run: async (ctx) => {
        const { io, ops } = ctx;
        const dir = dataDir(ctx);
        const owners = parseDataOwners(setting(ctx, "SAF_DATA_OWNERS"));
        const empty = await ops.sshCapture(
          newHost(ctx),
          isEmptyDirCommand(dir),
        );
        if (empty.trim() !== "empty") {
          const answer = await io.ask(
            `${dir} on the new machine isn't empty (an earlier attempt?). Type "clear" to empty it`,
          );
          if (answer !== "clear") throw new Error(`${dir} isn't empty`);
          await ops.sshCapture(
            newHost(ctx),
            `S=$([ "$(id -u)" = 0 ] || echo "sudo -n"); $S find '${dir}' -mindepth 1 -maxdepth 1 ! -name lost+found -exec rm -rf {} +`,
          );
        }
        io.print("Copying…");
        await ops.sshPipe(
          oldHost(ctx),
          tarCreateCommand(dir),
          newHost(ctx),
          tarExtractCommand(dir),
        );
        io.print("Comparing checksums…");
        const [before, after] = await Promise.all([
          ops.sshCapture(oldHost(ctx), checksumCommand(dir)),
          ops.sshCapture(newHost(ctx), checksumCommand(dir)),
        ]);
        if (before !== after) {
          throw new Error(
            "Checksums differ between the old and new copies. Clear the new disk and retry.",
          );
        }
        const files = before.split("\n").filter(Boolean).length;
        io.print(`${files} files match.`);
        const result = await ops.sshCapture(
          newHost(ctx),
          'S=$([ "$(id -u)" = 0 ] || echo "sudo -n"); $S python3 -',
          ownershipScript(dir, owners),
        );
        io.print(result.trim());
      },
    },
    {
      id: "address",
      title: "Move the static address",
      kind: "manual",
      describe: (ctx) => [
        "Move the old machine's static external address to the new machine. On GCP",
        "(check the access config's name with `gcloud compute instances describe <vm>`):",
        '  gcloud compute instances delete-access-config <old-vm> --access-config-name="External NAT" --zone=<zone>',
        '  gcloud compute instances delete-access-config <new-vm> --access-config-name="External NAT" --zone=<zone>',
        '  gcloud compute instances add-access-config <new-vm> --access-config-name="External NAT" --address=<static-ip> --zone=<zone>',
        "Then this step checks the address reaches the new machine (by its host keys),",
        `updates ~/.ssh/known_hosts for it, and points env.remote.${ctx.to} at it.`,
        "",
        `Afterwards, update your own pointers from the temporary address${ctx.state.newHost ? ` (${addressOf(ctx.state.newHost)})` : ""}`,
        "to the static one: ~/.ssh/config Host entries, the host/URL on the SSH key in",
        "your password manager, and so on. Other machines that SSH in (another laptop,",
        "CI) will see a changed host key for the static address: on each, run",
        "`ssh-keygen -R <static-ip>` and connect once to accept the new key.",
        "Then release the temporary address.",
      ],
      rollback: (ctx) => rollbackLines(ctx, true),
      run: async (ctx) => {
        const { io, ops, state } = ctx;
        const host = await io.ask(
          "New machine's SSH address now",
          oldHost(ctx),
        );
        const address = addressOf(host);
        const keys = await ops.scanHostKeys(address);
        const expected = state.newHostKeys ?? [];
        if (expected.length === 0 || keys.join("\n") !== expected.join("\n")) {
          throw new Error(
            `${address} doesn't present the new machine's host keys yet (still the old machine, or not moved)`,
          );
        }
        await ops.trustHostKeys(address, keys);
        const machineId = (
          await ops.sshCapture(host, "cat /etc/machine-id")
        ).trim();
        if (machineId !== state.newMachineId) {
          throw new Error(`${host} isn't the new machine`);
        }
        for (const dir of ctx.deployDirs) {
          writeTargetEnv(dir, ctx.to, { SSH_HOSTNAME: host });
        }
        io.print(
          `${host} reaches the new machine; env.remote.${ctx.to} updated.`,
        );
      },
    },
    {
      id: "start-new",
      title: "Start the stack on the new machine",
      kind: "auto",
      describe: (ctx) => [
        `\`saf-deploy up --target ${ctx.to}\` in each deploy, platform deploy first.`,
      ],
      rollback: (ctx) => rollbackLines(ctx, true),
      run: async (ctx) => {
        for (const config of toConfigs(ctx)) {
          ctx.io.print(`\n== ${relative(config.deployDir)}`);
          await ctx.ops.runRemote(config, upScript());
        }
      },
    },
    {
      id: "verify",
      title: "Check the product",
      kind: "manual",
      describe: (ctx) => {
        const url = setting(ctx, "SAF_MIGRATE_CHECK_URL");
        return [
          "Open the product, sign in, and check your health and ops dashboards.",
          ...(url ? [`This step also checks ${url} responds.`] : []),
        ];
      },
      rollback: (ctx) => rollbackLines(ctx, true),
      run: async (ctx) => {
        const url = setting(ctx, "SAF_MIGRATE_CHECK_URL");
        if (!url) return;
        const status = await ctx.ops.fetchStatus(url);
        ctx.io.print(`${url}: HTTP ${status}`);
        if (status >= 500) throw new Error(`${url} answered ${status}`);
      },
    },
    {
      id: "promote",
      title: "Make the new machine the default",
      kind: "auto",
      describe: (ctx) => [
        `In each deploy, merge env.remote.${ctx.to} into env.remote, keeping the old`,
        `machine's values as env.remote.${ctx.previousName}. Commit the result.`,
      ],
      run: async (ctx) => {
        for (const dir of ctx.deployDirs) {
          promoteTarget(dir, ctx.to, ctx.previousName);
          ctx.io.print(`Promoted ${relative(dir)}`);
        }
      },
    },
    {
      id: "afterwards",
      title: "Afterwards",
      kind: "info",
      describe: (ctx) => [
        "  - Keep the old VM stopped (not deleted) for a week, as a rollback.",
        "  - Check the new data disk's snapshot schedule.",
        "  - Commit the env.remote changes.",
        `  - Once all hosts run one architecture, narrow SAF_DEPLOY_PLATFORMS (now ${platforms(ctx)}).`,
        "  - Later: delete the old VM and its disks.",
      ],
    },
  ];
}
