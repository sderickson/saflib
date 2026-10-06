import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Build } from "./builds.ts";
import {
  buildImages,
  resolvePlatform,
  type BuildEvent,
  type BuildImagesOptions,
} from "./build-images.ts";
import {
  buildkitProgressTracker,
  parseBuildkitStep,
  type DockerBuildOptions,
  type DockerExecutor,
} from "./executor.ts";

class FakeDocker implements DockerExecutor {
  local = new Set<string>();
  remote = new Set<string>();
  calls: string[] = [];
  builds: DockerBuildOptions[] = [];
  failBuilds = new Set<string>();
  active = 0;
  maxActive = 0;

  async serverPlatform() {
    return "linux/arm64";
  }
  async localImageExists(ref: string) {
    return this.local.has(ref);
  }
  async remoteImageExists(ref: string) {
    return this.remote.has(ref);
  }
  async tag(source: string, target: string) {
    this.calls.push(`tag ${source} ${target}`);
    this.local.add(target);
  }
  async remoteTag(source: string, target: string) {
    this.calls.push(`remoteTag ${source} ${target}`);
    this.remote.add(target);
  }
  async pull(ref: string) {
    this.calls.push(`pull ${ref}`);
    this.local.add(ref);
  }
  async push(ref: string) {
    this.calls.push(`push ${ref}`);
    this.remote.add(ref);
  }
  async build(options: DockerBuildOptions) {
    this.active++;
    this.maxActive = Math.max(this.maxActive, this.active);
    await new Promise((r) => setTimeout(r, 5));
    this.active--;
    this.calls.push(`build ${options.tags[0]}`);
    this.builds.push(options);
    if (this.failBuilds.has(options.tags[0].split(":")[0])) {
      throw new Error("boom");
    }
    options.tags.forEach((t) => this.local.add(t));
  }
}

function git(cwd: string, args: string[]) {
  execFileSync("git", args, {
    cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "T",
      GIT_AUTHOR_EMAIL: "t@example.com",
      GIT_COMMITTER_NAME: "T",
      GIT_COMMITTER_EMAIL: "t@example.com",
    },
  });
}

describe("buildImages", () => {
  let root: string;
  let docker: FakeDocker;
  let builds: Build[];

  const write = (rel: string, contents: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), contents);
  };
  const makeBuild = (name: string, extraTags: string[] = []): Build => ({
    ref: `@x/${name}/builds/default`,
    packageName: `@x/${name}`,
    buildName: "default",
    dir: path.join(root, name),
    templatePath: path.join(root, name, "Dockerfile.template"),
    dockerfilePath: path.join(root, name, "Dockerfile"),
    image: `x-${name}`,
    extraTags,
  });
  const run = (overrides: Partial<BuildImagesOptions> = {}) =>
    buildImages({
      contextDir: root,
      builds,
      selected: [builds[2]],
      executor: docker,
      commits: { root: "aaa", saflib: "bbb" },
      logDir: path.join(root, ".logs"),
      now: () => new Date("2026-10-05T00:00:00Z"),
      ...overrides,
    });
  const outcomes = async (overrides: Partial<BuildImagesOptions> = {}) =>
    Object.fromEntries((await run(overrides)).map((r) => [r.image, r.outcome]));

  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(path.join(tmpdir(), "saflib-build-images-")),
    );
    git(root, ["init", "-q", "-b", "main"]);
    write(".gitignore", "Dockerfile\n.logs/\n");
    // base ← app ← web (web consumes app; app consumes base)
    write("base/src.ts", "base\n");
    write("base/Dockerfile", "FROM node:24\nCOPY ./base ./base\n");
    write("app/src.ts", "app\n");
    write("app/Dockerfile", "FROM x-base:latest\nCOPY ./app ./app\n");
    write("web/src.ts", "web\n");
    write(
      "web/Dockerfile",
      "FROM x-app:latest AS app\nFROM caddy:2\nCOPY --from=app /app /srv\nCOPY ./web ./web\n",
    );
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "init"]);
    builds = [makeBuild("base"), makeBuild("app"), makeBuild("web", ["v1"])];
    docker = new FakeDocker();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("builds upstreams first, tagging in-hash, latest and extra tags", async () => {
    const results = await run();
    expect(results.map((r) => [r.image, r.outcome])).toEqual([
      ["x-base", "built"],
      ["x-app", "built"],
      ["x-web", "built"],
    ]);
    expect(docker.calls.filter((c) => c.startsWith("build"))).toEqual(
      results.map((r) => `build ${r.image}:${r.tag}`),
    );
    const web = docker.builds[2];
    expect(web.tags).toEqual([
      `x-web:${results[2].tag}`,
      "x-web:latest",
      "x-web:v1",
    ]);
    expect(web.platform).toBeUndefined(); // native
    expect(JSON.parse(web.buildArgs.SAF_BUILD_INFO)).toEqual({
      schema: 1,
      buildRef: "@x/web/builds/default",
      image: "x-web",
      inputHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      commits: { root: "aaa", saflib: "bbb" },
      dirty: false,
      platform: "linux/arm64",
      builtAt: "2026-10-05T00:00:00.000Z",
      upstream: ["@x/app/builds/default"],
    });
    expect(web.labels["dev.saflib.build-ref"]).toBe("@x/web/builds/default");
    expect(web.dockerfile).toBe("web/Dockerfile");
  });

  it("skips everything on a second run, retagging latest", async () => {
    await run();
    docker.calls = [];
    expect(await outcomes()).toEqual({
      "x-base": "up-to-date",
      "x-app": "up-to-date",
      "x-web": "up-to-date",
    });
    expect(docker.calls.some((c) => c.startsWith("build"))).toBe(false);
    expect(docker.calls).toContainEqual(
      expect.stringMatching(/^tag x-web:in-\w+ x-web:latest$/),
    );
  });

  it("rebuilds only what a change reaches, and marks dirty builds", async () => {
    await run();
    write("app/src.ts", "app changed\n");
    const results = await run();
    expect(
      Object.fromEntries(results.map((r) => [r.image, r.outcome])),
    ).toEqual({
      "x-base": "up-to-date",
      "x-app": "built",
      "x-web": "built",
    });
    const info = JSON.parse(docker.builds.at(-1)!.buildArgs.SAF_BUILD_INFO);
    expect(info.dirty).toBe(true);
    expect(info.commits).toEqual({ root: "aaa-dirty", saflib: "bbb-dirty" });
  });

  it("uses a separate tag per platform and passes --platform when not native", async () => {
    const native = await run();
    const amd64 = await run({ platform: "amd64" });
    expect(amd64.every((r) => r.outcome === "built")).toBe(true);
    expect(amd64[0].tag).not.toBe(native[0].tag);
    expect(docker.builds.at(-1)!.platform).toBe("linux/amd64");
  });

  it("pushes every tag of built images to the registry", async () => {
    await run({ registry: "reg.io/team/", push: true, selected: [builds[0]] });
    const tag = [...docker.local]
      .find((t) => t.startsWith("x-base:in-"))!
      .split(":")[1];
    expect(docker.calls.filter((c) => c.startsWith("push"))).toEqual([
      `push reg.io/team/x-base:${tag}`,
      "push reg.io/team/x-base:latest",
    ]);
  });

  it("also tags local images with their registry names", async () => {
    const [base] = await run({ registry: "reg.io", selected: [builds[0]] });
    expect(docker.local).toContain(`reg.io/x-base:${base.tag}`);
    expect(docker.local).toContain("reg.io/x-base:latest");
    expect(docker.calls.some((c) => c.startsWith("push"))).toBe(false);
  });

  it("pulls registry hits when not pushing", async () => {
    await run({ registry: "reg.io", push: true });
    const pushed = new Set(docker.remote);
    docker = new FakeDocker();
    docker.remote = pushed; // fresh machine, warm registry

    expect(await outcomes({ registry: "reg.io" })).toEqual({
      "x-base": "pulled",
      "x-app": "pulled",
      "x-web": "pulled",
    });
    expect(docker.calls.some((c) => c.startsWith("build"))).toBe(false);
  });

  it("when pushing, only retags registry hits remotely and pulls just what a build needs", async () => {
    await run({ registry: "reg.io", push: true });
    const pushed = new Set(docker.remote);
    docker = new FakeDocker();
    docker.remote = pushed;

    // Nothing changed: nothing is pulled at all.
    expect(await outcomes({ registry: "reg.io", push: true })).toEqual({
      "x-base": "in-registry",
      "x-app": "in-registry",
      "x-web": "in-registry",
    });
    expect(docker.calls.filter((c) => c.startsWith("pull"))).toEqual([]);
    expect(docker.calls).toContainEqual(
      expect.stringMatching(
        /^remoteTag reg\.io\/x-web:in-\w+ reg\.io\/x-web:v1$/,
      ),
    );

    // web changes: only its direct upstream (app) is pulled, not base.
    write("web/src.ts", "web changed\n");
    docker.calls = [];
    expect(await outcomes({ registry: "reg.io", push: true })).toEqual({
      "x-base": "in-registry",
      "x-app": "in-registry",
      "x-web": "built",
    });
    expect(
      docker.calls
        .filter((c) => c.startsWith("pull") || c.startsWith("build"))
        .map((c) => c.replace(/:in-\w+/, "")),
    ).toEqual(["pull reg.io/x-app", "build x-web"]);
  });

  it("reports the plan before building, then each build's start and finish", async () => {
    await run({ selected: [builds[0]] }); // base is now local
    write("web/src.ts", "web changed\n");
    const events: BuildEvent[] = [];
    await run({ onEvent: (e) => events.push(e) });

    expect(events[0]).toMatchObject({
      type: "checked",
      plan: [
        { image: "x-base", action: "up-to-date" },
        { image: "x-app", action: "build" },
        { image: "x-web", action: "build" },
      ],
    });
    const lifecycle = events.slice(1).map((e) => {
      if (e.type === "finish") return `finish ${e.result.image}`;
      if (e.type === "checked") return "checked";
      return `${e.type} ${e.image}`;
    });
    expect(lifecycle).toEqual([
      "finish x-base",
      "start x-app",
      "finish x-app",
      "start x-web",
      "finish x-web",
    ]);
  });

  it("blocks downstream builds when an upstream fails", async () => {
    docker.failBuilds.add("x-app");
    expect(await outcomes()).toEqual({
      "x-base": "built",
      "x-app": "failed",
      "x-web": "blocked",
    });
  });

  it("changes nothing on a dry run", async () => {
    expect(await outcomes({ dryRun: true })).toEqual({
      "x-base": "would-build",
      "x-app": "would-build",
      "x-web": "would-build",
    });
    expect(docker.calls).toEqual([]);
  });

  it("rebuilds when forced", async () => {
    await run();
    expect(Object.values(await outcomes({ force: true }))).toEqual([
      "built",
      "built",
      "built",
    ]);
  });

  it("limits concurrent builds", async () => {
    await run({
      selected: builds,
      concurrency: 1,
      builds,
    });
    expect(docker.maxActive).toBe(1);
  });
});

describe("resolvePlatform", () => {
  it("resolves native and aliases to explicit platforms", () => {
    expect(resolvePlatform(undefined, "linux/arm64")).toEqual({
      platform: "linux/arm64",
    });
    expect(resolvePlatform("amd64", "linux/arm64")).toEqual({
      platform: "linux/amd64",
      flag: "linux/amd64",
    });
    expect(resolvePlatform("linux/amd64", "linux/amd64")).toEqual({
      platform: "linux/amd64",
    });
    expect(() => resolvePlatform("windows", "linux/arm64")).toThrow(
      /Unrecognized platform/,
    );
  });
});

describe("BuildKit progress", () => {
  it("parses step lines", () => {
    expect(parseBuildkitStep("#7 [builder 3/6] RUN npm ci")).toEqual({
      stage: "builder",
      index: 3,
      count: 6,
      step: "RUN npm ci",
    });
    expect(parseBuildkitStep("#4 [2/2] COPY . /app")).toMatchObject({
      stage: "",
      index: 2,
      count: 2,
    });
    expect(parseBuildkitStep("#7 DONE 1.2s")).toBeUndefined();
    expect(
      parseBuildkitStep("#1 [internal] load build definition"),
    ).toBeUndefined();
  });

  it("counts each step once across stages", () => {
    const seen: string[] = [];
    const track = buildkitProgressTracker((p) =>
      seen.push(`${p.done}/${p.total} ${p.step}`),
    );
    [
      "#5 [deps 1/3] FROM node",
      "#6 [deps 2/3] RUN npm ci",
      "#6 0.5 added 10 packages",
      "#6 [deps 2/3] RUN npm ci",
      "#7 [stage-1 1/2] FROM caddy",
      "#8 [deps 3/3] COPY . .",
    ].forEach(track);
    expect(seen).toEqual([
      "1/3 FROM node",
      "2/3 RUN npm ci",
      "3/5 FROM caddy",
      "4/5 COPY . .",
    ]);
  });
});
