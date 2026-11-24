import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  planPromote,
  promoteTarget,
  setEnvValues,
  writeTargetEnv,
} from "./env-files.ts";
import {
  checksumCommand,
  ownershipScript,
  parseDataOwners,
  tarCreateCommand,
  tarExtractCommand,
} from "./data.ts";
import { loadDeployConfig } from "../config.ts";

describe("env files", () => {
  it("sets values in place, keeping comments and other lines", () => {
    const before =
      "# host\nSSH_HOSTNAME=me@old\n# where\nREMOTE_ZIP_PATH=/home/me\nSSH_HOSTNAME=dup\n";
    expect(
      setEnvValues(before, { SSH_HOSTNAME: "me@new", SAF_USERNS_REMAP: "1" }),
    ).toBe(
      "# host\nSSH_HOSTNAME=me@new\n# where\nREMOTE_ZIP_PATH=/home/me\nSAF_USERNS_REMAP=1\n",
    );
  });

  it("quotes values that need it", () => {
    expect(setEnvValues("", { A: "two words", B: "a=b,c" })).toBe(
      'A="two words"\nB=a=b,c\n',
    );
  });

  it("promotes a target, keeping what it replaced as another target", () => {
    const plan = planPromote(
      "# comment\nSSH_HOSTNAME=me@old\nREMOTE_ZIP_PATH=/home/me\n",
      "# overrides\nSSH_HOSTNAME=me@new\nSAF_USERNS_REMAP=1\n",
      "previous",
    );
    expect(plan.envRemote).toBe(
      "# comment\nSSH_HOSTNAME=me@new\nREMOTE_ZIP_PATH=/home/me\nSAF_USERNS_REMAP=1\n",
    );
    expect(plan.previous).toContain("SSH_HOSTNAME=me@old\n");
    expect(plan.previous).toContain("SAF_USERNS_REMAP=\n");
  });

  describe("on disk", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), "saflib-migrate-env-"));
      writeFileSync(
        path.join(dir, "env.remote"),
        "SSH_HOSTNAME=me@old\nREMOTE_ZIP_PATH=/home/me\n",
      );
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("writes a target, then promotes it", () => {
      writeTargetEnv(dir, "next", { SSH_HOSTNAME: "me@new" });
      writeTargetEnv(dir, "next", { SAF_USERNS_REMAP: "1" });
      expect(loadDeployConfig(dir, "next").env).toEqual({
        SSH_HOSTNAME: "me@new",
        REMOTE_ZIP_PATH: "/home/me",
        SAF_USERNS_REMAP: "1",
      });

      promoteTarget(dir, "next", "previous");
      expect(existsSync(path.join(dir, "env.remote.next"))).toBe(false);
      expect(loadDeployConfig(dir, undefined).env.SSH_HOSTNAME).toBe("me@new");
      expect(loadDeployConfig(dir, "previous").env.SSH_HOSTNAME).toBe("me@old");
    });
  });
});

describe("data copy", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "saflib-migrate-data-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("parses SAF_DATA_OWNERS", () => {
    expect(parseDataOwners("app=1000:1000, kratos=10000:10001")).toEqual({
      app: { uid: 1000, gid: 1000 },
      kratos: { uid: 10000, gid: 10001 },
    });
    expect(parseDataOwners(undefined)).toEqual({});
    expect(() => parseDataOwners("app=1000")).toThrow(/folder=uid:gid/);
  });

  it("quotes paths in the tar and checksum commands", () => {
    expect(tarCreateCommand("/mnt/my data", ["opt/x"])).toContain(
      "tar -C '/mnt/my data' --numeric-owner -cpf - 'opt/x'",
    );
    expect(tarExtractCommand("/mnt/d")).toContain("tar -C '/mnt/d'");
    expect(checksumCommand("/mnt/d")).toContain("sha256sum");
  });

  it("checksums the same tree identically, wherever it is", () => {
    const a = path.join(dir, "a");
    mkdirSync(path.join(a, "app/db"), { recursive: true });
    writeFileSync(path.join(a, "app/db/x.sqlite"), "data");
    writeFileSync(path.join(a, "top.txt"), "top");
    const sum = (d: string) =>
      execFileSync("bash", ["-c", checksumCommand(d).replace(/sudo -n/, "")], {
        encoding: "utf8",
      });
    const listing = sum(a);
    expect(listing).toMatch(/ {2}\.\/app\/db\/x\.sqlite\n/);
    const b = path.join(dir, "b");
    execFileSync("cp", ["-R", a, b]);
    expect(sum(b)).toBe(listing);
  });

  it("plans shifted owners, setting listed folders to their container user", () => {
    const data = path.join(dir, "data");
    mkdirSync(path.join(data, "app/db"), { recursive: true });
    mkdirSync(path.join(data, "kratos"), { recursive: true });
    mkdirSync(path.join(data, "lost+found"));
    writeFileSync(path.join(data, "app/db/x.sqlite"), "");
    writeFileSync(path.join(data, "kratos/db.sqlite"), "");
    const script = path.join(dir, "own.py");
    writeFileSync(
      script,
      ownershipScript(data, parseDataOwners("app=1000:1000")),
    );
    const out = execFileSync(
      "python3",
      ["-I", script, "--dry-run", "--base=100000:200000"],
      { encoding: "utf8" },
    );
    const { uid, gid } = statSync(path.join(data, "kratos/db.sqlite"));
    expect(out.trim().split("\n")).toEqual([
      "101000:201000 app",
      "101000:201000 app/db",
      "101000:201000 app/db/x.sqlite",
      `${100000 + uid}:${200000 + gid} kratos`,
      `${100000 + uid}:${200000 + gid} kratos/db.sqlite`,
    ]);
    expect(readFileSync(script, "utf8")).not.toContain("undefined");
  });
});
