import { beforeAll, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import { countBootsSince, listBoots, opsDb, recordBoot } from "../../index.ts";

const build = (ref: string) => ({
  service_name: "svc",
  color: "blue",
  build_ref: ref,
  image: "img",
  input_hash: `hash-${ref}`,
  commit_root: "c1",
  commit_saflib: "s1",
  dirty: false,
  built_at: new Date("2026-11-01T00:00:00Z"),
  node_version: "v24.0.0",
  released_at: null,
  release_commit_root: null,
  release_commit_saflib: null,
  release_assets_hash: null,
});

describe("ops boots", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = opsDb.connect();
  });

  it("flags only boots whose build changed as new builds", async () => {
    const t = (m: number) => new Date(Date.UTC(2026, 10, 8, 12, m));
    const a = await throwError(recordBoot(dbKey, { ...build("a"), started_at: t(0) }));
    const restart = await throwError(recordBoot(dbKey, { ...build("a"), started_at: t(1) }));
    const green = await throwError(
      recordBoot(dbKey, { ...build("a"), color: "green", started_at: t(2) }),
    );
    const b = await throwError(recordBoot(dbKey, { ...build("b"), started_at: t(3) }));
    expect([a.new_build, restart.new_build, green.new_build, b.new_build]).toEqual([
      true,
      false,
      false,
      true,
    ]);

    const deploys = await throwError(listBoots(dbKey, { newBuildsOnly: true, limit: 10 }));
    expect(deploys.map((d) => d.build_ref)).toEqual(["b", "a"]);
    const all = await throwError(listBoots(dbKey, { limit: 2 }));
    expect(all.map((d) => d.id)).toEqual([b.id, green.id]);
    expect(await throwError(countBootsSince(dbKey, t(1)))).toBe(3);
  });

  it("counts a release-only change (config deploy, same image) as a deploy", async () => {
    const t = (m: number) => new Date(Date.UTC(2026, 10, 9, 12, m));
    const release = (assets: string) => ({
      ...build("same"),
      service_name: "svc-release",
      released_at: t(0),
      release_commit_root: "r1",
      release_commit_saflib: "s1",
      release_assets_hash: assets,
    });
    const first = await throwError(recordBoot(dbKey, { ...release("kratos-v1"), started_at: t(0) }));
    const restart = await throwError(recordBoot(dbKey, { ...release("kratos-v1"), started_at: t(1) }));
    const config = await throwError(recordBoot(dbKey, { ...release("kratos-v2"), started_at: t(2) }));
    expect([first.new_build, restart.new_build, config.new_build]).toEqual([true, false, true]);
    expect(config.release_assets_hash).toBe("kratos-v2");
  });
});
