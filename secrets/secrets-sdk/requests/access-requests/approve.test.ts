import { describe, it, expect, assert } from "vitest";
import { useApproveAccessRequest } from "./approve.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";

describe("approveAccessRequest", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should approve an access request", async () => {
    const [mutation, app] = withVueQuery(() => useApproveAccessRequest());

    const approveData = {
      id: "request-1",
      approved: true,
      approved_by: "admin@example.com",
      reason: "Approved for testing",
    };

    await mutation.mutateAsync(approveData);

    expect(mutation.data).toBeDefined();
    const data = mutation.data?.value;
    assert(data);
    expect(data).toMatchObject({
      id: "request-1",
      secret_id: "secret-1",
      secret_name: "database-password",
      service_name: "test-service-1",
      status: "granted",
      granted_by: "admin@example.com",
    });

    app.unmount();
  });

  it("should deny an access request", async () => {
    const [mutation, app] = withVueQuery(() => useApproveAccessRequest());

    const denyData = {
      id: "request-1",
      approved: false,
      approved_by: "admin@example.com",
      reason: "Denied for security reasons",
    };

    await mutation.mutateAsync(denyData);

    expect(mutation.data).toBeDefined();
    const data = mutation.data?.value;
    assert(data);
    expect(data).toMatchObject({
      id: "request-1",
      secret_id: "secret-1",
      secret_name: "database-password",
      service_name: "test-service-1",
      status: "denied",
      granted_by: "admin@example.com",
    });

    app.unmount();
  });
});
