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

  it("GET /api/workflows lists the registry through the real mount", async () => {
    ctx = acquireRouterSlimRouteTest(createWorkflowsRouter);

    const response = await request(ctx.app).get("/api/workflows");

    expect(response.status).toBe(200);
    expect(response.body.workflows).toEqual([
      {
        id: "example/hello",
        description: HelloWorkflowDefinition.description,
        source: "code",
        inputSchema: HelloWorkflowDefinition.inputSchema,
      },
      {
        id: "drizzle/add-query",
        description: AddDrizzleQueryWorkflowDefinition.description,
        source: "code",
        inputSchema: AddDrizzleQueryWorkflowDefinition.inputSchema,
      },
    ]);
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
