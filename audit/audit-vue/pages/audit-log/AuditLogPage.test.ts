import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { stubGlobals } from "@saflib/vue/testing";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import AuditLogPage from "./AuditLogPage.vue";
import { mountTestApp } from "../../test-app.ts";

type ListAuditLogsResponse = AuditResponseBody["listAuditLogs"][200];

const mockAuditLogs: ListAuditLogsResponse = {
  audit_logs: [
    {
      id: "evt-1",
      ts: "2026-01-01T00:00:00.000Z",
      prev_hash: "0".repeat(64),
      row_hash: "abc123",
      schema_version: 1,
      source: "http",
      actor_user_id: "user-1",
      on_behalf_of_user_id: null,
      auth_method: "kratos_session",
      request_id: "req-1",
      client_ip: "127.0.0.1",
      event_type: "admin.test_error",
      resource_type: "admin",
      resource_id: null,
      outcome: "error",
      git_commit_root: "deadbeef",
      git_commit_saflib: "cafebabe",
      env: "test",
      details: { source: "http", method: "POST", status_code: 500 },
    },
  ],
  head_at: "2026-01-01T00:00:00.000Z",
  tail_at: "2026-01-01T00:00:00.000Z",
  next_cursor: null,
};

vi.mock("@saflib/audit-sdk/requests/list-audit-logs", () => ({
  useListAuditLogs: () => ({
    data: ref(mockAuditLogs),
    error: ref(null),
    isLoading: ref(false),
    isFetching: ref(false),
    isError: ref(false),
  }),
}));

vi.mock("@saflib/audit-sdk/requests/seal-audit-log", () => ({
  useSealAuditLog: () => ({
    isPending: ref(false),
    mutateAsync: vi.fn(),
  }),
}));

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
