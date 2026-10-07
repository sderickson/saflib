import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Build } from "./builds.ts";
import { DockerIgnore } from "./dockerignore.ts";
import { generateContextIgnore } from "./context-ignore.ts";
import {
  combineInputs,
  computeBuildInputs,
  inputTag,
  parseContextSources,
  parseImageReferences,
} from "./inputs.ts";

describe("parseContextSources", () => {
  it("collects COPY/ADD context sources, skipping --from and heredocs", () => {
    const dockerfile = [
      "FROM node:24-slim AS builder",
      "COPY .saf-docker/stage/app/ ./",
      "COPY --parents ./pkg-a ./lib/pkg-b \\",
      "  ./lib/pkg-c ./",
      "COPY --from=builder /app/dist /srv",
      'COPY ["./deploy/env.defaults", "/etc/env.defaults"]',
      "ADD https://example.com/x.tgz /tmp/",
      "COPY <<EOF /etc/x",
      "COPY ./assets/*.png ./public/",
      "RUN echo hi",
    ].join("\n");
    expect(parseContextSources(dockerfile)).toEqual([
      ".saf-docker/stage/app",
      "assets",
      "deploy/env.defaults",
      "lib/pkg-b",
      "lib/pkg-c",
      "pkg-a",
    ]);
  });

  it("maps `.` to the whole context", () => {
    expect(parseContextSources("COPY . /app")).toEqual([""]);
  });
});

describe("parseImageReferences", () => {
  it("returns base and --from images, excluding named stages", () => {
    const dockerfile = [
      "FROM saflib-root:latest AS root-builder",
      "RUN npm run build",
      "FROM --platform=linux/amd64 caddy:2.11.3",
      "COPY --from=root-builder /app/dist /srv",
      "COPY --from=nginx:1 /etc/nginx /etc/nginx",
      "FROM scratch",
    ].join("\n");
    expect(parseImageReferences(dockerfile)).toEqual([
      "caddy:2.11.3",
      "nginx:1",
      "saflib-root:latest",
    ]);
  });
});

describe("DockerIgnore", () => {
  const ignore = new DockerIgnore(
    [
      "# comment",
      "node_modules",
      "**/node_modules",
      "dist",
      "**/dist/types",
      "**/*.log",
      "!keep.log",
    ].join("\n"),
  );

  it("anchors plain patterns at the context root", () => {
    expect(ignore.ignores("dist")).toBe(true);
    expect(ignore.ignores("dist/a.js")).toBe(true);
    expect(ignore.ignores("pkg/dist/a.js")).toBe(false);
  });

  it("supports ** across directories and excludes directory contents", () => {
    expect(ignore.ignores("a/b/node_modules")).toBe(true);
    expect(ignore.ignores("a/b/node_modules/x/index.js")).toBe(true);
    expect(ignore.ignores("pkg/dist/types/index.d.ts")).toBe(true);
    expect(ignore.ignores("a/debug.log")).toBe(true);
  });

  it("lets a later ! rule re-include", () => {
    expect(ignore.ignores("keep.log")).toBe(false);
  });
});

describe("combineInputs", () => {
  it("is order-independent and sensitive to every field", () => {
    const a = { kind: "git" as const, key: "pkg-a", hash: "1" };
    const b = { kind: "scalar" as const, key: "platform", hash: "native" };
    expect(combineInputs([a, b])).toBe(combineInputs([b, a]));
    expect(combineInputs([a, b])).not.toBe(
      combineInputs([{ ...a, hash: "2" }, b]),
    );
    expect(combineInputs([a, b])).not.toBe(
      combineInputs([{ ...a, key: "pkg-b" }, b]),
    );
  });
});

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();
}

describe("computeBuildInputs", () => {
  let root: string;
  let builds: Build[];

  const write = (rel: string, contents: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), contents);
  };
  const makeBuild = (pkg: string, dir: string, image: string): Build => ({
    ref: `${pkg}/builds/default`,
    packageName: pkg,
    buildName: "default",
    dir: path.join(root, dir),
    templatePath: path.join(root, dir, "Dockerfile.template"),
    dockerfilePath: path.join(root, dir, "Dockerfile"),
    image,
    extraTags: [],
    secrets: {},
  });
  const compute = (build: Build, platform?: string) =>
    computeBuildInputs(build, { contextDir: root, builds, platform });

  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(path.join(tmpdir(), "saflib-docker-inputs-")),
    );
    git(root, ["init", "-q", "-b", "main"]);
    write(".gitignore", "Dockerfile\n.saf-docker/\n**/dist/\n");
    write(".dockerignore", "**/dist/types\n");
    write("lib/src/index.ts", "export const lib = 1;\n");
    write("app/src/index.ts", "export const app = 1;\n");
    write(
      "app/Dockerfile",
      "FROM node:24-slim\nCOPY .saf-docker/stage/app/ ./\nCOPY --parents ./app ./lib ./\n",
    );
    write(".saf-docker/stage/app/package.json", '{"name":"app"}\n');
    write("other/index.ts", "export {};\n");
    write(
      "web/Dockerfile",
      "FROM app:latest AS app-builder\nFROM caddy:2\nCOPY --from=app-builder /app /srv\nCOPY ./web/Caddyfile /etc/Caddyfile\n",
    );
    write("web/Caddyfile", ":80\n");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "base"]);
    builds = [
      makeBuild("@x/app", "app", "app"),
      makeBuild("@x/web", "web", "web"),
    ];
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("hashes git sources via git, generated files from disk, and is clean after commit", () => {
    const result = compute(builds[0]);
    expect(result.dirty).toBe(false);
    expect(result.inputs.map((i) => `${i.kind}:${i.key}`)).toEqual([
      "file:.dockerignore",
      "file:.saf-docker/stage/app",
      "file:app/Dockerfile",
      "git:app",
      "git:lib",
      "scalar:platform",
      "scalar:schema",
    ]);
    expect(result.inputs.find((i) => i.key === "lib")!.hash).toBe(
      git(root, ["rev-parse", "HEAD:lib"]),
    );
    expect(result.externalImages).toEqual(["node:24-slim"]);
    expect(inputTag(result.inputHash)).toMatch(/^in-[0-9a-f]{16}$/);
  });

  it("is unchanged by edits outside its inputs and by committing them", () => {
    const before = compute(builds[0]).inputHash;
    write("other/index.ts", "export const changed = true;\n");
    expect(compute(builds[0]).inputHash).toBe(before);
    git(root, ["commit", "-q", "-am", "unrelated"]);
    expect(compute(builds[0]).inputHash).toBe(before);
  });

  it("changes (and reports dirty) when a dependency changes, and matches once committed", () => {
    const before = compute(builds[0]).inputHash;
    write("lib/src/index.ts", "export const lib = 2;\n");
    const dirty = compute(builds[0]);
    expect(dirty.inputHash).not.toBe(before);
    expect(dirty.dirty).toBe(true);
    git(root, ["commit", "-q", "-am", "change lib"]);
    const committed = compute(builds[0]);
    expect(committed.dirty).toBe(false);
    expect(committed.inputHash).toBe(dirty.inputHash);
  });

  it("changes when staged install files, the Dockerfile, or the platform change", () => {
    const before = compute(builds[0]).inputHash;
    expect(compute(builds[0], "linux/amd64").inputHash).not.toBe(before);
    write(
      ".saf-docker/stage/app/package.json",
      '{"name":"app","dependencies":{"x":"1"}}\n',
    );
    const afterStage = compute(builds[0]).inputHash;
    expect(afterStage).not.toBe(before);
    write(
      "app/Dockerfile",
      "FROM node:26-slim\nCOPY .saf-docker/stage/app/ ./\nCOPY --parents ./app ./lib ./\n",
    );
    expect(compute(builds[0]).inputHash).not.toBe(afterStage);
  });

  it("chains upstream builds by input hash", () => {
    const web = compute(builds[1]);
    const app = compute(builds[0]);
    expect(web.inputs.find((i) => i.kind === "upstream")).toEqual({
      kind: "upstream",
      key: "@x/app/builds/default",
      hash: app.inputHash,
    });
    expect(web.externalImages).toEqual(["caddy:2"]);

    write("lib/src/index.ts", "export const lib = 3;\n");
    expect(compute(builds[1]).inputHash).not.toBe(web.inputHash);
    expect(compute(builds[1]).dirty).toBe(true);
  });

  it("flags gitignored files that reach the context, but not dockerignored ones", () => {
    write("lib/dist/types/index.d.ts", "export {};\n");
    expect(compute(builds[0]).gitInvisibleContextFiles).toEqual([]);
    write("lib/dist/index.js", "built\n");
    expect(compute(builds[0]).gitInvisibleContextFiles).toEqual(["lib/dist/"]);
  });

  it("generates a per-build ignore file excluding gitignored paths under its sources", () => {
    write("app/data/upload.pdf", "user data\n"); // gitignored via app/.gitignore
    write("app/.gitignore", "data/\n*.log\n");
    write("app/debug.log", "noise\n");
    write("other/secret.txt", "not a source of this build\n");
    const ignore = generateContextIgnore(
      root,
      readFileSync(path.join(root, "app/Dockerfile"), "utf8"),
    );
    expect(ignore).toContain("**/dist/types"); // the context's rules come first
    expect(ignore).toContain("\napp/data\n");
    expect(ignore).toContain("\napp/debug.log\n");
    expect(ignore).not.toContain(".saf-docker"); // an ignored *source* is kept
    expect(ignore).not.toContain("other/");

    // With it in place, the audit finds nothing reaching the context.
    write("app/Dockerfile.dockerignore", ignore);
    expect(compute(builds[0]).gitInvisibleContextFiles).toEqual([]);
  });

  it("errors when the Dockerfile hasn't been generated", () => {
    rmSync(path.join(root, "app/Dockerfile"));
    expect(() => compute(builds[0])).toThrow(/saf-docker generate/);
  });
});
