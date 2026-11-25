import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { stubGlobals } from "@saflib/vue/testing";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import AuditLogPage from "./AuditLogPage.vue";
import { router } from "../test_router.ts";
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

const listOptions: { userId?: { value: string | undefined } }[] = [];
vi.mock("@saflib/audit-sdk/requests/list-audit-logs", () => ({
  useListAuditLogs: (options: { userId?: { value: string | undefined } }) => {
    listOptions.push(options);
    return {
    data: ref(mockAuditLogs),
    error: ref(null),
    isLoading: ref(false),
    isFetching: ref(false),
    isError: ref(false),
    };
  },
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
    // Not a Kratos id, so the actor shows as a ShortId; the request too.
    expect(wrapper.text()).toContain("u·user");
    expect(wrapper.text()).toContain("r·req1");
  });

  it("filters to ?user= and shows a removable chip", async () => {
    await router.push("/audit?user=user-1");
    const wrapper = mountTestApp(AuditLogPage, { props: {} });
    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="audit-user-filter"]').exists()).toBe(true);
    });
    expect(listOptions.at(-1)?.userId?.value).toBe("user-1");
    await wrapper.find('[data-test="audit-user-filter"] .v-chip__close').trigger("click");
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query.user).toBeUndefined();
    });
  });
});
