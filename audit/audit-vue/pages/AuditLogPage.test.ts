import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
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

vi.mock("@saflib/audit-sdk/requests/list-audit-logs", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@saflib/audit-sdk/requests/list-audit-logs")
    >();
  return {
    ...actual,
    useListAuditLogs: () => ({
      data: ref(mockAuditLogs),
      error: ref(null),
      isLoading: ref(false),
      refetch: vi.fn(),
    }),
  };
});

describe("AuditLogPage", () => {
  beforeEach(() => {
    stubGlobals();
  });

  it("renders audit rows", async () => {
    const wrapper = mountTestApp(AuditLogPage, {
      props: { subdomain: "api" },
    });

    expect(wrapper.text()).toContain("Audit log");
    expect(wrapper.text()).toContain("admin.test_error");
    expect(wrapper.text()).toContain("user-1");
  });
});
