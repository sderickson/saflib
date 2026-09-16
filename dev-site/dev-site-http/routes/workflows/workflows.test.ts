import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { AddDrizzleQueryWorkflowDefinition } from "@saflib/drizzle-workflows";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "../../testing/slim-route-test.ts";
import { createWorkflowsRouter } from "./index.ts";

describe("workflows routes (mounted into dev-site-http)", () => {
  let ctx: SlimRouteTestContext;

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  it("GET /api/workflows lists the registry through the real mount, including ported workflows", async () => {
    ctx = acquireRouterSlimRouteTest(createWorkflowsRouter);

    const response = await request(ctx.app).get("/api/workflows");

    expect(response.status).toBe(200);
    const ids = response.body.workflows.map((w: { id: string }) => w.id);
    // Not an exact-list assertion — the registry grows as more workflows get
    // ported off the old XState engine; just prove the mount actually wires
    // up the whole registry (one representative id per ported package).
    expect(ids).toEqual(expect.arrayContaining([
      "example/hello",
      "drizzle/add-query",
      "drizzle/update-schema",
      "service/add-store",
      "express/add-handler",
      "monorepo/add-export",
      "monorepo/add-package",
      "commander/add-cli",
      "commander/add-command",
      "sdk/add-component",
      "sdk/add-mutation",
      "sdk/add-query",
      "openapi/route",
      "openapi/schema",
      "openapi/add-event",
      "env/add-var",
      "integrations/add-call",
      "email/add-template",
      "cron/add-job",
      "jobs/add-job",
      "vue/add-e2e-test",
      "vue/add-spa",
      "vue/add-static-site",
      "vue/add-view",
      "cron/init",
      "jobs/init",
      "processes/spec-project",
    ]));
    // Deliberately NOT registered — see service-workflows/index.ts's comment:
    // `service/init-common` throws on a fresh copy due to a pre-existing
    // template/workflow coupling issue unrelated to this port.
    expect(ids).not.toContain("service/init-common");
    expect(new Set(ids).size).toBe(ids.length);

    const hello = response.body.workflows.find((w: { id: string }) => w.id === "example/hello");
    expect(hello).toEqual({
      id: "example/hello",
      description: HelloWorkflowDefinition.description,
      source: "code",
      inputSchema: HelloWorkflowDefinition.inputSchema,
    });
    const addQuery = response.body.workflows.find((w: { id: string }) => w.id === "drizzle/add-query");
    expect(addQuery).toEqual({
      id: "drizzle/add-query",
      description: AddDrizzleQueryWorkflowDefinition.description,
      source: "code",
      inputSchema: AddDrizzleQueryWorkflowDefinition.inputSchema,
    });
  });

  it("a run's default cwd is dev-site's own repo_root", async () => {
    ctx = acquireRouterSlimRouteTest(createWorkflowsRouter);

    const created = await request(ctx.app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "x" } });

    expect(created.status).toBe(201);
    expect(created.body.run.cwd).toBe(process.cwd());
  });
});
