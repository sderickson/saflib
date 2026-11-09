import { describe, expect, it } from "vitest";
import request from "supertest";
import { createToken, opsDb } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import { parseLockfile } from "./manifest.ts";
import { compareVersions, updateKind } from "./semver.ts";
import { checkDependencies } from "./check.ts";
import { runDependencyCheckOnce } from "./scheduler.ts";
import { parseOsRelease, runtimeCycles } from "./runtime.ts";

const lockfile = JSON.stringify({
  lockfileVersion: 3,
  packages: {
    "": { workspaces: ["svc/http"] },
    "svc/http": { name: "@me/http", dependencies: { express: "^5.0.0", "@scope/lib": "^1.0.0", "@me/common": "*" } },
    "node_modules/@me/common": { resolved: "svc/common", link: true },
    "node_modules/express": { version: "5.2.1", dependencies: { "body-parser": "^2" } },
    "node_modules/body-parser": { version: "2.3.0" },
    "node_modules/@scope/lib": { version: "1.0.0" },
    "node_modules/express/node_modules/qs": { version: "6.0.0" },
    "node_modules/vitest": { version: "3.0.0", dev: true },
  },
});

describe("parseLockfile", () => {
  it("lists installed packages, marking direct ones and skipping links and dev deps", () => {
    const m = parseLockfile(lockfile, "v24.0.0");
    expect(m.packages).toEqual([
      { name: "@scope/lib", version: "1.0.0", direct: true },
      { name: "body-parser", version: "2.3.0", direct: false },
      { name: "express", version: "5.2.1", direct: true },
      { name: "qs", version: "6.0.0", direct: false },
    ]);
    expect(m.lockfileHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("semver helpers", () => {
  it("compares and classifies updates", () => {
    expect(compareVersions("1.2.3", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0-beta.1", "2.0.0")).toBe(-1);
    expect(updateKind("1.2.3", "2.0.0")).toBe("major");
    expect(updateKind("1.2.3", "1.3.0")).toBe("minor");
    expect(updateKind("1.2.3", "1.2.4")).toBe("patch");
    expect(updateKind("1.2.3", "1.2.3")).toBeUndefined();
  });
});

/** A fake OSV + npm registry. */
function fakeFetch(opts: { osvDown?: boolean } = {}): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.endsWith("/v1/querybatch")) {
      if (opts.osvDown) return json({}, 503);
      const queries = (JSON.parse(String(init!.body)) as { queries: { package: { name: string } }[] }).queries;
      return json({ results: queries.map((q) => (q.package.name === "body-parser" ? { vulns: [{ id: "GHSA-aaaa" }] } : {})) });
    }
    if (url.endsWith("/v1/vulns/GHSA-aaaa")) {
      return json({
        id: "GHSA-aaaa",
        aliases: ["CVE-2026-1"],
        summary: "body-parser DoS <script>",
        database_specific: { severity: "HIGH" },
        affected: [{ package: { name: "body-parser", ecosystem: "npm" }, ranges: [{ events: [{ introduced: "0" }, { fixed: "2.4.0" }] }] }],
      });
    }
    if (url.endsWith("/-/package/express/dist-tags")) return json({ latest: "5.3.0" });
    if (url.endsWith("/-/package/@scope%2Flib/dist-tags")) return json({ latest: "1.0.0" });
    if (url.endsWith("/express")) return json({ time: { "5.3.0": "2026-10-09T00:00:00.000Z" } });
    if (url.endsWith("/api/nodejs.json")) {
      return json([
        { cycle: "24", eol: "2028-04-30", latest: "24.22.2" },
        { cycle: "22", eol: "2027-01-31", latest: "22.30.0" },
      ]);
    }
    if (url.endsWith("/api/debian.json")) return json([{ cycle: "12", eol: "2026-12-31", latest: "12.15" }]);
    return json({}, 404);
  }) as typeof fetch;
}

const now = new Date("2026-11-09T00:00:00Z");

describe("runtime", () => {
  it("reads os-release and maps runtimes to endoflife.date cycles", () => {
    const os = parseOsRelease('PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nID=debian\nVERSION_ID="12"\n');
    expect(os).toEqual({ id: "debian", versionId: "12" });
    expect(runtimeCycles("v24.11.0", os)).toEqual([
      { name: "nodejs", version: "24.11.0", cycle: "24" },
      { name: "debian", version: "12", cycle: "12" },
    ]);
    expect(runtimeCycles("v24.11.0", { id: "alpine", versionId: "3.22.1" })[1]).toEqual({
      name: "alpine-linux",
      version: "3.22.1",
      cycle: "3.22",
    });
    expect(parseOsRelease("NAME=nothing\n")).toBeNull();
  });
});

describe("checkDependencies", () => {
  it("reports runtime end of life, flagging one within 90 days", async () => {
    const manifest = { ...parseLockfile(lockfile, "v24.11.0"), osRelease: { id: "debian", versionId: "12" } };
    const r = await checkDependencies(manifest, { fetch: fakeFetch(), now });
    expect(r.runtime).toEqual([
      { name: "nodejs", version: "24.11.0", cycle: "24", eol: "2028-04-30", eol_soon: false, latest_in_cycle: "24.22.2" },
      { name: "debian", version: "12", cycle: "12", eol: "2026-12-31", eol_soon: true, latest_in_cycle: "12.15" },
    ]);
  });

  it("finds advisories with fixed versions and outdated direct dependencies", async () => {
    const r = await checkDependencies(parseLockfile(lockfile, "v24.11.0"), { fetch: fakeFetch(), now });
    expect(r.errors).toEqual([]);
    expect(r.advisories).toEqual([
      expect.objectContaining({ id: "GHSA-aaaa", severity: "high", package: "body-parser", deployed: "2.3.0", fixed_in: "2.4.0", direct: false, actionable: true }),
    ]);
    expect(r.outdated).toEqual([
      { name: "express", deployed: "5.2.1", latest: "5.3.0", latest_published_at: "2026-10-09T00:00:00.000Z", update: "minor", renovate_due: true },
    ]);
  });
});

describe("runDependencyCheckOnce", () => {
  it("skips a recently checked lockfile, rechecks a new one, and keeps the last report when OSV is down", async () => {
    const dbKey = opsDb.connect();
    const manifest = parseLockfile(lockfile);
    expect(await runDependencyCheckOnce({ dbKey, manifest, fetch: fakeFetch(), now })).toBeDefined();
    const later = new Date(now.getTime() + 3_600_000);
    expect(await runDependencyCheckOnce({ dbKey, manifest, fetch: fakeFetch(), now: later })).toBeUndefined();
    const changed = { ...manifest, lockfileHash: "different" };
    expect(await runDependencyCheckOnce({ dbKey, manifest: changed, fetch: fakeFetch(), now: later })).toBeDefined();
    const dayLater = new Date(now.getTime() + 25 * 3_600_000);
    await expect(runDependencyCheckOnce({ dbKey, manifest: changed, fetch: fakeFetch({ osvDown: true }), now: dayLater })).rejects.toThrow(/dependency check failed/);
  });
});

describe("GET /ops/dependencies and the digest", () => {
  it("serves the latest check, with advisory text as untrusted, and flags high advisories", async () => {
    const dbKey = opsDb.connect();
    const app = createApp({ dbKey });
    const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
    const auth = { authorization: `Bearer ${token}` };
    expect((await request(app).get("/ops/dependencies").set(auth).expect(200)).body).toEqual({ dependencies: null });

    const manifest = { ...parseLockfile(lockfile, "v22.1.0"), osRelease: { id: "debian", versionId: "12" } };
    await runDependencyCheckOnce({ dbKey, manifest, fetch: fakeFetch(), now: new Date() });
    const deps = (await request(app).get("/ops/dependencies").set(auth).expect(200)).body.dependencies;
    expect(deps).toMatchObject({ stale: false, packages_total: 4, direct_total: 2 });
    expect(deps.advisories[0]).toMatchObject({ id: "GHSA-aaaa", untrusted: { summary: "body-parser DoS <script>" } });
    expect(deps.advisories[0].summary).toBeUndefined();
    expect(deps.runtime.map((c: { name: string }) => c.name)).toEqual(["nodejs", "debian"]);

    const digest = (await request(app).get("/ops/digest").set(auth).expect(200)).body.digest;
    expect(digest.dependencies).toMatchObject({ stale: false, actionable: 1, outdated_direct: 1, renovate_due: 1, advisories: { high: 1 } });
    expect(typeof digest.dependencies.runtime_eol_soon).toBe("number");
    expect(digest.summary.needs_attention).toBe(true);
  });
});

describe("accepted advisories", () => {
  it("keep an accepted advisory in the report but not actionable, until the acceptance lapses", async () => {
    const { findAcceptance } = await import("./accepted.ts");
    const accepted = [{ id: "CVE-2026-1", reason: "no upstream fix", until: "2026-12-01" }];
    expect(findAcceptance(["GHSA-aaaa", "CVE-2026-1"], accepted, new Date("2026-12-01T23:00:00Z"))).toBeDefined();
    expect(findAcceptance(["GHSA-aaaa", "CVE-2026-1"], accepted, new Date("2026-12-02T01:00:00Z"))).toBeUndefined();

    const dbKey = opsDb.connect();
    const app = createApp({ dbKey, dependencies: { acceptedAdvisories: [{ id: "CVE-2026-1", reason: "no upstream fix" }] } });
    const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
    const auth = { authorization: `Bearer ${token}` };
    await runDependencyCheckOnce({ dbKey, manifest: parseLockfile(lockfile, "v24.11.0"), fetch: fakeFetch(), now: new Date() });
    const deps = (await request(app).get("/ops/dependencies").set(auth).expect(200)).body.dependencies;
    expect(deps.advisories[0]).toMatchObject({ id: "GHSA-aaaa", actionable: false, accepted: { reason: "no upstream fix", until: null } });
    const digest = (await request(app).get("/ops/digest").set(auth).expect(200)).body.digest;
    expect(digest.dependencies.actionable).toBe(0);
  });
});

describe("dependency metrics", () => {
  it("exports advisory counts (accepted separately), runtime EOL and check time", async () => {
    const client = (await import("prom-client")).default;
    const { registerDependencyMetrics } = await import("./metrics.ts");
    const dbKey = opsDb.connect();
    const manifest = { ...parseLockfile(lockfile, "v24.11.0"), osRelease: { id: "debian", versionId: "12" } };
    await runDependencyCheckOnce({ dbKey, manifest, fetch: fakeFetch(), now });
    registerDependencyMetrics(dbKey, [{ id: "GHSA-aaaa", reason: "r" }]);
    const text = (await client.register.metrics());
    expect(text).toContain('saf_dependency_advisories{severity="high"} 0');
    expect(text).toContain('saf_dependency_advisories{severity="accepted"} 1');
    expect(text).toMatch(/^saf_dependency_runtime_eol_soon 1$/m);
    expect(text).toMatch(/^saf_dependency_check_timestamp_seconds \d+/m);
  });
});
