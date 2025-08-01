// @ts-nocheck // TODO: remove this
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { setupMockServer, withVueQuery } from "@saflib/vue-spa-dev/requests.js";
import { useQuery } from "@tanstack/vue-query";
import { useQueryTemplate } from "./query-template.js";
import type {
  GetQueryTemplateResponse,
  CreateQueryTemplateBody,
  UpdateQueryTemplateBody,
} from "./query-template.js";

const mockResponse: GetQueryTemplateResponse = {
  // TODO: Add mock response structure based on OpenAPI spec
  // Example:
  // items: [
  //   {
  //     id: 1,
  //     name: "Item 1",
  //     created_at: "2023-01-01T00:00:00Z",
  //     updated_at: "2023-01-01T00:00:00Z",
  //   },
  // ],
};

describe("Query Template API Interactions", () => {
  const handlers = [
    http.get("http://caller.localhost:3000/query-template", () => {
      return HttpResponse.json(mockResponse);
    }),
    // TODO: Add mutation handlers using OpenAPI spec types
    // Example:
    // http.post("http://caller.localhost:3000/query-template", async ({ request }) => {
    //   const body = (await request.json()) as CreateQueryTemplateBody;
    //   const newItem = {
    //     ...body,
    //     id: 1,
    //     created_at: "2023-01-01T00:00:00Z",
    //     updated_at: "2023-01-01T00:00:00Z",
    //   };
    //   return HttpResponse.json({
    //     item: newItem,
    //   });
    // }),
    // http.put("http://caller.localhost:3000/query-template/1", async ({ request }) => {
    //   const body = (await request.json()) as UpdateQueryTemplateBody;
    //   const updatedItem = {
    //     ...mockResponse.items[0],
    //     ...body,
    //     updated_at: "2023-01-02T00:00:00Z",
    //   };
    //   return HttpResponse.json({
    //     item: updatedItem,
    //   });
    // }),
  ];

  setupMockServer(handlers);

  it("should fetch data and handle cache invalidation", async () => {
    const [query, app, queryClient] = withVueQuery(() => useQueryTemplate());

    // Wait for initial fetch
    await query.refetch();
    expect(query.data.value).toEqual(mockResponse);

    // TODO: Add mutation test using OpenAPI spec types
    // Example:
    // const [mutation] = withVueQuery(() => useCreateQueryTemplate());
    // const newItem: CreateQueryTemplateBody = {
    //   name: "New Item",
    // };
    //
    // await mutation.mutateAsync(newItem);
    //
    // // Verify cache was invalidated
    // const cachedData = queryClient.getQueryData(["query-template"]);
    // expect(cachedData).toBeUndefined();

    app.unmount();
  });
});
