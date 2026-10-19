import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import lockfile from "proper-lockfile";
import { GENESIS_HASH } from "@saflib/audit-db/hash-chain";
import { auditDb } from "@saflib/audit-db/instances";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import { verifyAuditChain } from "@saflib/audit-db/queries/audit-event/verify-chain";
import {
  AuditChainCorruptError,
  AuditSealEmailError,
} from "@saflib/audit-db/seal-errors";
import type { DbKey } from "@saflib/drizzle";
import type { EmailService } from "@saflib/email-service";
import { TestObjectStore } from "@saflib/object-store";
import { sealAndShipAuditDb } from "./seal-and-ship.ts";
import { createObjectStoreShipSealedArchive } from "./ship-to-object-store.ts";
import { readLastDigest } from "./last-digest.ts";

const systemDetails = () => ({
  source: "system" as const,
  operation: "test.seal",
});

function setup(
  options: { recipient?: string; sendEmail?: EmailService["sendEmail"] } = {},
) {
  const objectStore = new TestObjectStore();
  const sendEmail = vi.fn(options.sendEmail ?? (async () => ({}) as never));
  const emailService = { isMocked: true, sendEmail } as unknown as EmailService;
  return { objectStore, sendEmail, emailService, recipient: options.recipient };
}

async function seal(
  auditDbKey: DbKey,
  dataRoot: string,
  env: ReturnType<typeof setup>,
) {
  return sealAndShipAuditDb({
    auditDbKey,
    dataRoot,
    trigger: { kind: "cron" },
    shipSealedArchive: createObjectStoreShipSealedArchive({
      objectStore: env.objectStore,
      dataRoot,
      digest: {
        recipient: env.recipient,
        from: "noreply@example.com",
        serviceName: "api",
        environment: "audit-seal-test",
        emailService: env.emailService,
      },
    }),
  });
}

async function readBody(store: TestObjectStore, key: string): Promise<Buffer> {
  const res = await store.readFile(key);
  if (res.error) throw res.error;
  const chunks: Buffer[] = [];
  for await (const c of res.result) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

describe("createObjectStoreShipSealedArchive with sealAndShipAuditDb", () => {
  const keys: DbKey[] = [];
  beforeEach(() => {
    // appendAuditEvent records the deployment name on each row.
    vi.stubEnv("DEPLOYMENT_NAME", "audit-seal-test");
  });
  afterEach(() => {
    while (keys.length) auditDb.disconnect(keys.pop()!);
    vi.unstubAllEnvs();
  });

  async function onDiskAuditDb(dir: string, name = "audit.sqlite") {
    const dbPath = path.join(dir, name);
    const key = auditDb.connect({ onDisk: dbPath, overrideTestDefault: true });
    keys.push(key);
    return { key, dbPath };
  }

  it("skips an empty audit DB (no upload, no email)", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-empty-"));
    const key = auditDb.connect();
    keys.push(key);
    const env = setup({ recipient: "audit@example.com" });

    const result = await seal(key, dataRoot, env);

    expect(result).toMatchObject({ status: "skipped", reason: "empty" });
    expect(env.sendEmail).not.toHaveBeenCalled();
    expect(env.objectStore.getFiles()).toHaveLength(0);
  });

  it("skips while another seal holds the lock", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-lock-"));
    const { key } = await onDiskAuditDb(dataRoot, "active.sqlite");
    await appendAuditEvent(key, {
      ts: new Date("2026-05-05T00:30:00.000Z"),
      source: "system",
      event_type: "test.lock",
      outcome: "success",
      details: systemDetails(),
    });
    const release = await lockfile.lock(path.join(dataRoot, ".seal.lock"), {
      retries: 0,
      realpath: false,
    });
    try {
      const env = setup({ recipient: "audit@example.com" });
      const result = await seal(key, dataRoot, env);
      expect(result).toMatchObject({
        status: "skipped",
        reason: "in_progress",
      });
      expect(env.sendEmail).not.toHaveBeenCalled();
      expect(env.objectStore.getFiles()).toHaveLength(0);
    } finally {
      await release();
    }
  });

  it("throws AuditChainCorruptError on a corrupt chain (no upload, no email)", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-bad-"));
    const { key, dbPath } = await onDiskAuditDb(dataRoot);
    await appendAuditEvent(key, {
      ts: new Date("2026-05-05T00:30:00.000Z"),
      source: "system",
      event_type: "test.corrupt",
      outcome: "success",
      details: systemDetails(),
    });
    auditDb.disconnect(key);
    const raw = new Database(dbPath);
    raw
      .prepare(
        `UPDATE audit_event SET row_hash = ? WHERE id = (SELECT id FROM audit_event LIMIT 1)`,
      )
      .run("bb".repeat(32));
    raw.close();
    auditDb.attachAtPath(key, dbPath);

    const env = setup({ recipient: "audit@example.com" });
    await expect(seal(key, dataRoot, env)).rejects.toThrow(
      AuditChainCorruptError,
    );
    expect(env.sendEmail).not.toHaveBeenCalled();
    expect(env.objectStore.getFiles()).toHaveLength(0);
  });

  it("seals, uploads a verified archive, emails and records the digest, and restarts the chain", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-ok-"));
    const { key } = await onDiskAuditDb(dataRoot, "audit-active.sqlite");
    const firstTs = new Date("2026-05-05T00:30:00.123Z");
    const lastTs = new Date("2026-05-05T12:00:00.456Z");
    for (const [ts, event_type] of [
      [firstTs, "test.first"],
      [lastTs, "test.second"],
    ] as const) {
      await appendAuditEvent(key, {
        ts,
        source: "system",
        event_type,
        outcome: "success",
        details: systemDetails(),
      });
    }

    const env = setup({ recipient: "audit-group@example.com" });
    const result = await seal(key, dataRoot, env);

    const archiveKey =
      "audit/2026/05/05/audit-2026-05-05T00-30-00.123Z.sqlite.zst";
    expect(result.status).toBe("sealed");
    expect(result.archive?.archive_key).toBe(archiveKey);

    const uploaded = env.objectStore.getFiles();
    expect(uploaded.map((f) => f.path)).toEqual([archiveKey]);
    const body = await readBody(env.objectStore, archiveKey);
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      result.archive?.sha256_hex,
    );

    const { decompress } = await import("@saflib/audit-db/zstd");
    const roundtripPath = path.join(dataRoot, "roundtrip.sqlite");
    await writeFile(roundtripPath, await decompress(body));
    const roundtripKey = auditDb.connect({
      onDisk: roundtripPath,
      overrideTestDefault: true,
    });
    keys.push(roundtripKey);
    const verified = await verifyAuditChain(roundtripKey, {});
    expect(verified.result).toMatchObject({ valid: true, rowCount: 2 });

    expect(env.sendEmail).toHaveBeenCalledTimes(1);
    const email = env.sendEmail.mock.calls[0]![0];
    expect(email.to).toBe("audit-group@example.com");
    expect(email.subject).toBe(
      "[audit] audit-seal-test audit-2026-05-05T00-30-00.123Z.sqlite.zst — 2 events",
    );
    expect(email.text).toContain(`Archive key:           ${archiveKey}`);
    expect(email.text).toContain(
      `Window first row (UTC):  ${firstTs.toISOString()}`,
    );
    expect(email.text).toContain("Trigger:               cron");
    expect((await readLastDigest(dataRoot))?.archiveKey).toBe(archiveKey);

    const bounds = await getAuditEventTimestampBounds(key);
    expect(bounds.result?.headAt).toBeNull();
    await appendAuditEvent(key, {
      ts: new Date("2026-05-06T01:00:00.000Z"),
      source: "system",
      event_type: "post.seal",
      outcome: "success",
      details: systemDetails(),
    });
    const listed = await listAuditEventsByTimestamp(key, {
      limit: 1,
      order: "asc",
    });
    expect(listed.result?.events[0]?.prev_hash).toBe(GENESIS_HASH);
  });

  it("uploads but neither emails nor records a digest without a recipient", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-norecipient-"));
    const { key } = await onDiskAuditDb(dataRoot);
    await appendAuditEvent(key, {
      ts: new Date("2026-06-01T00:00:00.000Z"),
      source: "system",
      event_type: "test.norecipient",
      outcome: "success",
      details: systemDetails(),
    });
    const env = setup();
    const result = await seal(key, dataRoot, env);
    expect(result.status).toBe("sealed");
    expect(env.objectStore.getFiles()).toHaveLength(1);
    expect(env.sendEmail).not.toHaveBeenCalled();
    expect(await readLastDigest(dataRoot)).toBeNull();
  });

  it("throws AuditSealEmailError when the digest email fails after upload", async () => {
    const dataRoot = await mkdtemp(path.join(os.tmpdir(), "seal-email-fail-"));
    const { key } = await onDiskAuditDb(dataRoot);
    await appendAuditEvent(key, {
      ts: new Date("2026-07-01T10:00:00.000Z"),
      source: "system",
      event_type: "test.email.fail",
      outcome: "success",
      details: systemDetails(),
    });
    const env = setup({
      recipient: "audit-group@example.com",
      sendEmail: async () => {
        throw new Error("SMTP unavailable");
      },
    });
    await expect(seal(key, dataRoot, env)).rejects.toThrow(AuditSealEmailError);
    expect(env.objectStore.getFiles()).toHaveLength(1);
  });
});
