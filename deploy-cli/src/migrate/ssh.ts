import { spawn } from "node:child_process";
import { requireRemote, type DeployConfig } from "../config.ts";
import { announceTarget, remotePayload } from "../remote.ts";

/** Fail instead of prompting; trust a host's key the first time it's seen. */
export const SSH_OPTIONS = [
  "-o",
  "BatchMode=yes",
  "-o",
  "StrictHostKeyChecking=accept-new",
  "-o",
  "ConnectTimeout=15",
];

/** Runs a local command, resolving its stdout (stderr goes to the terminal). */
export function capture(
  command: string,
  args: string[],
  input?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "inherit"],
    });
    let out = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => (out += chunk));
    if (input !== undefined) child.stdin!.end(input);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(out)
        : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)),
    );
  });
}

/** `ssh host '<command>'`, resolving stdout. */
export function sshCapture(
  host: string,
  command: string,
  input?: string,
): Promise<string> {
  return capture("ssh", [...SSH_OPTIONS, host, command], input);
}

/** Runs a saf-deploy remote script (with env.remote exported), resolving stdout. */
export function runRemoteCapture(
  config: DeployConfig,
  script: string,
): Promise<string> {
  const { sshHostname } = requireRemote(config);
  announceTarget(config);
  return sshCapture(sshHostname, "bash -s", remotePayload(config, script));
}

/**
 * Pipes `ssh from '<fromCommand>'`'s stdout into `ssh to '<toCommand>'`,
 * through this machine (so the hosts need no keys for each other).
 */
export function sshPipe(
  from: string,
  fromCommand: string,
  to: string,
  toCommand: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = spawn("ssh", [...SSH_OPTIONS, from, fromCommand], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    const sink = spawn("ssh", [...SSH_OPTIONS, to, toCommand], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    source.stdout!.pipe(sink.stdin!);
    const codes: Record<string, number | null> = {};
    let failed = false;
    const done = (name: string, code: number | null) => {
      codes[name] = code;
      if (code !== 0 && !failed) {
        failed = true;
        source.kill();
        sink.kill();
        reject(new Error(`${name} side of the copy exited with ${code}`));
      }
      if (codes.source === 0 && codes.sink === 0) resolve();
    };
    source.on("error", reject);
    sink.on("error", reject);
    source.on("close", (code) => done("source", code));
    sink.on("close", (code) => done("sink", code));
  });
}

/** `user@host` → `host`. */
export function addressOf(sshHostname: string): string {
  return sshHostname.includes("@")
    ? sshHostname.slice(sshHostname.lastIndexOf("@") + 1)
    : sshHostname;
}

/** A host's public keys as `<type> <key>` lines (sorted), via ssh-keyscan. */
export async function scanHostKeys(address: string): Promise<string[]> {
  const out = await capture("ssh-keyscan", ["-T", "10", address]);
  return out
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(" ").slice(1).join(" "))
    .sort();
}
