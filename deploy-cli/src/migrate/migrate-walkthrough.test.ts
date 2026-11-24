import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadDeployConfig, type DeployConfig } from "../config.ts";
import { readRemoteScript, upScript } from "../remote.ts";
import {
  loadState,
  runSteps,
  type MigrateIO,
  type MigrateState,
  type Step,
} from "./runner.ts";
import {
  migrationSteps,
  preflight,
  type MigrateContext,
  type MigrateOps,
} from "./steps.ts";

/** Scripted operator: `choices` in order (default Enter), answers by question. */
function scriptedIO(
  answers: (question: string) => string,
  choices: ("go" | "skip" | "quit")[] = [],
): MigrateIO & { output: string[] } {
  const output: string[] = [];
  let prompts = 0;
  return {
    output,
    print: (text = "") => output.push(text),
    choose: async () => {
      if (++prompts > 50) {
        throw new Error(`Too many prompts; output:\n${output.join("\n")}`);
      }
      return choices.shift() ?? "go";
    },
    ask: async (question, fallback) => answers(question) || fallback || "",
    close: () => {},
  };
}

const freshState = (): MigrateState => ({
  version: 1,
  to: "next",
  completed: [],
  skipped: [],
});

describe("runSteps", () => {
  const steps = (log: string[], failOnce = new Set<string>()): Step<null>[] =>
    ["a", "b", "c"].map((id) => ({
      id,
      title: id.toUpperCase(),
      kind: "auto" as const,
      describe: () => [],
      run: async () => {
        if (failOnce.delete(id)) throw new Error(`${id} failed`);
        log.push(id);
      },
    }));

  it("stops on quit and resumes where it stopped", async () => {
    const log: string[] = [];
    const state = freshState();
    const io = scriptedIO(() => "", ["go", "quit"]);
    expect(await runSteps(steps(log), null, state, io, () => {})).toBe("quit");
    expect(state.completed).toEqual(["a"]);
    expect(
      await runSteps(
        steps(log),
        null,
        state,
        scriptedIO(() => ""),
        () => {},
      ),
    ).toBe("done");
    expect(log).toEqual(["a", "b", "c"]);
  });

  it("records skipped steps and retries failed ones", async () => {
    const log: string[] = [];
    const state = freshState();
    const io = scriptedIO(() => "", ["skip", "go", "go", "go"]);
    await runSteps(steps(log, new Set(["b"])), null, state, io, () => {});
    expect(state.skipped).toEqual(["a"]);
    expect(log).toEqual(["b", "c"]);
    expect(io.output).toContain("✗ b failed");
  });
});

describe("migration walkthrough", () => {
  let root: string;
  let platform: string;
  let app: string;

  const writeDeploy = (dir: string, extra: string) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "env.remote"),
      `# host\nSSH_HOSTNAME=me@old\nREMOTE_ZIP_PATH=/home/me\nREMOTE_ASSETS_FOLDER_PATH=/home/me/${path.basename(dir)}\n${extra}`,
    );
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "saflib-migrate-walk-"));
    platform = path.join(root, "platform");
    app = path.join(root, "app");
    writeDeploy(
      platform,
      "CONTAINER_REGISTRY=ghcr.io/me\nSAF_DATA_DIR=/mnt/data\nSAF_DEPLOY_PLATFORMS=amd64,arm64\nSAF_MIGRATE_HOST_PATHS=/opt/secrets\nSAF_DATA_OWNERS=app=1000:1000\n",
    );
    writeDeploy(app, "");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("moves the stack, stopping old before copying and starting new after the move", async () => {
    let moved = false;
    const calls: string[] = [];
    const scriptName = (script: string) =>
      script === upScript()
        ? "up"
        : ((["setup", "pull", "down"] as const).find(
            (n) => script === readRemoteScript(n),
          ) ?? "other");
    const where = (config: DeployConfig) =>
      `${path.basename(config.deployDir)}@${config.env.SSH_HOSTNAME}`;
    const ops: MigrateOps = {
      sshCapture: async (host, command, input) => {
        if (command.includes("machine-id")) {
          const id = host === "me@old" && !moved ? "old-id" : "new-id";
          return command.includes("uname")
            ? `${id}\naarch64\nUbuntu 26.04 LTS\n`
            : `${id}\n`;
        }
        if (command.includes(".docker/config.json")) {
          calls.push(`registry@${host}`);
          expect(command).toContain('"ghcr.io"');
          return "yes\n";
        }
        if (command.startsWith("findmnt")) return "mounted\nfstab\n";
        if (command.includes("-print -quit")) return "empty\n";
        if (command.includes("sha256sum")) return "abc  ./app/db.sqlite\n";
        if (command.includes("python3")) {
          calls.push(`ownership@${host}`);
          expect(input).toMatch(/app[^\n]*uid[^\n]*1000[^\n]*gid[^\n]*1000/);
          return "ownership: base 165536:165536, 3 entries changed\n";
        }
        throw new Error(`unexpected command ${command}`);
      },
      sshPipe: async (from, fromCommand, to) => {
        calls.push(
          `copy ${fromCommand.includes("opt/secrets") ? "host-files" : "data"} ${from}->${to}`,
        );
      },
      scanHostKeys: async (address) =>
        address === "temp" || moved ? ["ssh-ed25519 NEW"] : ["ssh-ed25519 OLD"],
      runRemote: async (config, script) => {
        calls.push(`${scriptName(script)} ${where(config)}`);
      },
      runRemoteCapture: async () => "",
      syncAssets: async (config) => {
        calls.push(`sync ${where(config)}`);
      },
      trustHostKeys: async (address, keys) => {
        calls.push(`trust ${address} ${keys.join(",")}`);
      },
      fetchStatus: async () => 200,
    };
    const io = scriptedIO((question) =>
      question.startsWith("New machine's SSH address (user@address)")
        ? "me@temp"
        : "",
    );
    const print = io.print;
    io.print = (text = "") => {
      if (text.includes("Move the static address")) moved = true;
      print(text);
    };
    const state = freshState();
    const ctx: MigrateContext = {
      deployDirs: [platform, app],
      to: "next",
      previousName: "previous",
      state,
      io,
      ops,
    };

    expect(await runSteps(migrationSteps(), ctx, state, io, () => {})).toBe(
      "done",
    );
    expect(calls).toEqual([
      "setup platform@me@temp",
      "registry@me@temp",
      "sync platform@me@temp",
      "pull platform@me@temp",
      "sync app@me@temp",
      "pull app@me@temp",
      "copy host-files me@old->me@temp",
      "down app@me@old",
      "down platform@me@old",
      "copy data me@old->me@temp",
      "ownership@me@temp",
      "trust old ssh-ed25519 NEW",
      "up platform@me@old",
      "up app@me@old",
    ]);
    expect(state.userNamespaces).toBe(true);
    for (const dir of [platform, app]) {
      expect(existsSync(path.join(dir, "env.remote.next"))).toBe(false);
      const env = loadDeployConfig(dir, undefined).env;
      expect(env.SSH_HOSTNAME).toBe("me@old");
      expect(env.SAF_USERNS_REMAP).toBe("1");
      expect(readFileSync(path.join(dir, "env.remote"), "utf8")).toMatch(
        /^# host\n/,
      );
      expect(loadDeployConfig(dir, "previous").env.SAF_USERNS_REMAP).toBe("");
    }
  });

  it("won't treat the old machine as the new one", async () => {
    const ops = {
      sshCapture: async (_host: string, command: string) =>
        command.includes("uname") ? "old-id\nx86_64\nUbuntu\n" : "old-id\n",
    } as unknown as MigrateOps;
    const state = freshState();
    state.completed = ["machine"];
    const io = scriptedIO(() => "me@old", ["go", "quit"]);
    await runSteps(
      migrationSteps(),
      {
        deployDirs: [platform, app],
        to: "next",
        previousName: "previous",
        state,
        io,
        ops,
      },
      state,
      io,
      () => {},
    );
    expect(io.output).toContain("✗ me@old is the old machine");
    expect(existsSync(path.join(platform, "env.remote.next"))).toBe(false);
  });

  it("refuses deploys that point at different hosts", () => {
    writeDeploy(app, "SSH_HOSTNAME=me@elsewhere\n");
    const ctx = {
      deployDirs: [platform, app],
      to: "next",
      previousName: "previous",
      state: freshState(),
      io: scriptedIO(() => ""),
      ops: {} as MigrateOps,
    };
    expect(() => preflight(ctx)).toThrow(/SSH_HOSTNAME differ.*me@elsewhere/);
    writeDeploy(app, "");
    expect(() => preflight(ctx)).not.toThrow();
  });

  it("starts fresh when saved progress is for another target", () => {
    const file = path.join(root, "state.json");
    writeFileSync(
      file,
      JSON.stringify({ ...freshState(), to: "other", completed: ["machine"] }),
    );
    expect(loadState(file, "next").completed).toEqual([]);
  });
});
