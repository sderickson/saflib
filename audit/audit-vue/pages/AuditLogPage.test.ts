import { describe, it, expect, vi, beforeEach } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import AuditLogPage from "./AuditLogPage.vue";
import { mountTestApp } from "../test-app";

type ListAuditLogsResponse = AuditResponseBody["listAuditLogs"][200];

const mockAuditLogs: ListAuditLogsResponse = {
  auditLogs: [
    {
      id: "evt-1",
      ts: "2026-01-01T00:00:00.000Z",
      prevHash: "0".repeat(64),
      rowHash: "abc123",
      schemaVersion: 1,
      source: "http",
      actorUserId: "user-1",
      onBehalfOfUserId: null,
      authMethod: "kratos_session",
      requestId: "req-1",
      clientIp: "127.0.0.1",
      eventType: "admin.test_error",
      resourceType: "admin",
      resourceId: null,
      outcome: "error",
      gitCommitRoot: "deadbeef",
      gitCommitSaflib: "cafebabe",
      env: "test",
      details: { source: "http", method: "POST", status_code: 500 },
    },
  ],
  headAt: "2026-01-01T00:00:00.000Z",
  tailAt: "2026-01-01T00:00:00.000Z",
  nextCursor: null,
};

vi.mock("@saflib/audit-sdk/client", () => ({
  getClient: () => ({
    GET: vi.fn(async () => ({
      response: { status: 200 },
      data: mockAuditLogs,
    })),
  }),
}));

vi.mock("@saflib/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@saflib/sdk")>();
  return {
    ...actual,
    handleClientMethod: async (p: Promise<{ data?: unknown }>) => {
      const result = await p;
      return result.data;
    },
  };
});

describe("AuditLogPage", () => {
  beforeEach(() => {
    stubGlobals();
  });

  it("renders audit rows", async () => {
    const wrapper = mountTestApp(AuditLogPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("admin.test_error");
    });

    expect(wrapper.text()).toContain("Audit log");
    expect(wrapper.text()).toContain("user-1");
  });
});
