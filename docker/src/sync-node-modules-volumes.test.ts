import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { vi } from "vitest";
import {
  decideVolumeSync,
  findAppNodeModulesVolumes,
  hashStageDirectory,
  planVolumeSyncs,
  readVolumeStamps,
  stripImageTag,
  writeVolumeStamps,
  type ComposeConfig,
} from "./sync-node-modules-volumes.ts";

vi.mock("node:fs");
vi.mock("node:fs/promises");

beforeEach(() => {
  vol.reset();
});

afterEach(() => {
  vol.reset();
});

describe("stripImageTag", () => {
  it("strips a :tag suffix", () => {
    expect(stripImageTag("vendata-power-up-monolith:latest")).toBe(
      "vendata-power-up-monolith",
    );
  });

  it("keeps registry paths and only strips the final tag", () => {
    expect(stripImageTag("ghcr.io/vendata/power-up-monolith:1.2.3")).toBe(
      "ghcr.io/vendata/power-up-monolith",
    );
  });

  it("strips digests", () => {
    expect(
      stripImageTag(
        "vendata-power-up-monolith@sha256:abcdef0123456789abcdef0123456789",
      ),
    ).toBe("vendata-power-up-monolith");
  });
});

describe("findAppNodeModulesVolumes", () => {
  const config: ComposeConfig = {
    services: {
      clients: {
        image: "vendata-power-up-clients:latest",
        volumes: [
          { type: "bind", source: "../..", target: "/app" },
          {
            type: "volume",
            source: "clients_node_modules",
            target: "/app/node_modules",
          },
        ],
      },
      "power-up-monolith": {
        image: "vendata-power-up-monolith:latest",
        volumes: [
          {
            type: "volume",
            source: "monolith_node_modules",
            target: "/app/node_modules",
          },
        ],
      },
      site: {
        image: "saflib-dev-site:latest",
        volumes: [
          {
            type: "volume",
            source: "repo_node_modules",
            target: "/repo/node_modules",
          },
        ],
      },
    },
    volumes: {
      clients_node_modules: {
        name: "vendata-power-up-dev-clients-node-modules",
      },
      monolith_node_modules: {
        name: "vendata-power-up-dev-monolith-node-modules",
      },
      repo_node_modules: {
        name: "vendata-power-up-dev-repo-node-modules",
      },
    },
  };

  it("picks /app/node_modules named volumes and skips /repo/node_modules", () => {
    expect(findAppNodeModulesVolumes(config)).toEqual([
      {
        serviceName: "clients",
        volumeKey: "clients_node_modules",
        volumeName: "vendata-power-up-dev-clients-node-modules",
        imageName: "vendata-power-up-clients",
      },
      {
        serviceName: "power-up-monolith",
        volumeKey: "monolith_node_modules",
        volumeName: "vendata-power-up-dev-monolith-node-modules",
        imageName: "vendata-power-up-monolith",
      },
    ]);
  });
});

describe("hashStageDirectory", () => {
  it("is stable for the same contents", () => {
    vol.fromJSON({
      "/repo/.saf-docker/stage/img/package.json": '{"name":"a"}\n',
      "/repo/.saf-docker/stage/img/package-lock.json": '{"lockfileVersion":3}\n',
    });
    const a = hashStageDirectory("/repo/.saf-docker/stage/img");
    const b = hashStageDirectory("/repo/.saf-docker/stage/img");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when a staged package.json changes", () => {
    vol.fromJSON({
      "/repo/.saf-docker/stage/img/package.json": '{"name":"a"}\n',
      "/repo/.saf-docker/stage/img/nested/package.json": '{"name":"nested"}\n',
    });
    const before = hashStageDirectory("/repo/.saf-docker/stage/img");
    vol.writeFileSync(
      "/repo/.saf-docker/stage/img/nested/package.json",
      '{"name":"nested","dependencies":{"@saflib/jobs-http":"*"}}\n',
    );
    const after = hashStageDirectory("/repo/.saf-docker/stage/img");
    expect(after).not.toBe(before);
  });

  it("throws when the stage directory is missing", () => {
    expect(() => hashStageDirectory("/repo/.saf-docker/stage/missing")).toThrow(
      /Install stage not found/,
    );
  });
});

describe("decideVolumeSync", () => {
  const target = {
    serviceName: "power-up-monolith",
    volumeKey: "monolith_node_modules",
    volumeName: "vendata-power-up-dev-monolith-node-modules",
    imageName: "vendata-power-up-monolith",
  };

  it("reuses when stamp matches and volume exists", () => {
    expect(
      decideVolumeSync({
        target,
        stageHash: "abc",
        previousHash: "abc",
        volumeExists: true,
      }),
    ).toMatchObject({ action: "reuse", reason: "stamp-match" });
  });

  it("refreshes on stamp mismatch", () => {
    expect(
      decideVolumeSync({
        target,
        stageHash: "new",
        previousHash: "old",
        volumeExists: true,
      }),
    ).toMatchObject({ action: "refresh", reason: "stamp-mismatch" });
  });

  it("refreshes when there is no stamp", () => {
    expect(
      decideVolumeSync({
        target,
        stageHash: "abc",
        previousHash: undefined,
        volumeExists: true,
      }),
    ).toMatchObject({ action: "refresh", reason: "no-stamp" });
  });

  it("refreshes when the volume is missing", () => {
    expect(
      decideVolumeSync({
        target,
        stageHash: "abc",
        previousHash: "abc",
        volumeExists: false,
      }),
    ).toMatchObject({ action: "refresh", reason: "volume-missing" });
  });
});

describe("planVolumeSyncs + stamps", () => {
  it("plans refresh vs reuse from stamps and stage hashes", () => {
    vol.fromJSON({
      "/repo/.saf-docker/stage/vendata-power-up-clients/package.json":
        '{"name":"clients"}\n',
      "/repo/.saf-docker/stage/vendata-power-up-monolith/package.json":
        '{"name":"monolith"}\n',
    });
    const clientsHash = hashStageDirectory(
      "/repo/.saf-docker/stage/vendata-power-up-clients",
    );
    writeVolumeStamps("/repo", {
      "vendata-power-up-dev-clients-node-modules": clientsHash,
    });

    const config: ComposeConfig = {
      services: {
        clients: {
          image: "vendata-power-up-clients:latest",
          volumes: [
            {
              type: "volume",
              source: "clients_node_modules",
              target: "/app/node_modules",
            },
          ],
        },
        monolith: {
          image: "vendata-power-up-monolith:latest",
          volumes: [
            {
              type: "volume",
              source: "monolith_node_modules",
              target: "/app/node_modules",
            },
          ],
        },
      },
      volumes: {
        clients_node_modules: {
          name: "vendata-power-up-dev-clients-node-modules",
        },
        monolith_node_modules: {
          name: "vendata-power-up-dev-monolith-node-modules",
        },
      },
    };

    const decisions = planVolumeSyncs({
      config,
      repoRoot: "/repo",
      stamps: readVolumeStamps("/repo"),
      volumeExists: () => true,
    });

    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toMatchObject({
      target: { volumeKey: "clients_node_modules" },
      action: "reuse",
    });
    expect(decisions[1]).toMatchObject({
      target: { volumeKey: "monolith_node_modules" },
      action: "refresh",
      reason: "no-stamp",
    });

    writeVolumeStamps("/repo", {
      "vendata-power-up-dev-clients-node-modules": clientsHash,
      "vendata-power-up-dev-monolith-node-modules": decisions[1]!.stageHash,
    });
    expect(
      readVolumeStamps("/repo")[
        "vendata-power-up-dev-monolith-node-modules"
      ],
    ).toBe(decisions[1]!.stageHash);
  });
});
