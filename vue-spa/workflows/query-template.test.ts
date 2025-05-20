import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { setupMockServer, withVueQuery } from "@saflib/vue-spa-dev/requests.js";
import { useQuery } from "@tanstack/vue-query";
import { useQueryTemplate } from "./query-template.js";
import type { QueryTemplateResponse } from "./query-template.js";

const mockResponse: QueryTemplateResponse = {
  // TODO: Add mock response structure
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
    http.get("http://api.localhost:3000/query-template", () => {
      return HttpResponse.json(mockResponse);
    }),
    // TODO: Add more handlers for mutations if needed
    // Example:
    // http.post("http://api.localhost:3000/query-template", async ({ request }) => {
    //   const body = await request.json();
    //   return HttpResponse.json({
    //     ...body,
    //     id: 1,
    //     created_at: "2023-01-01T00:00:00Z",
    //     updated_at: "2023-01-01T00:00:00Z",
    //   });
    // }),
  ];

  setupMockServer(handlers);

  it("should fetch data and handle cache invalidation", async () => {
    const [query, app, queryClient] = withVueQuery(() => useQueryTemplate());

    // Wait for initial fetch
    await query.refetch();
    expect(query.data.value).toEqual(mockResponse);

    // TODO: Add mutation test if needed
    // Example:
    // const [mutation] = withVueQuery(() => useCreateQueryTemplate());
    // await mutation.mutateAsync({
    //   name: "New Item",
    // });
    //
    // // Verify cache was invalidated
    // const cachedData = queryClient.getQueryData(["query-template"]);
    // expect(cachedData).toBeUndefined();

    app.unmount();
  });
});
