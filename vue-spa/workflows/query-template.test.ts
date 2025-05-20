import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/vue";
import { useQueryTemplate } from "./query-template";
import { createTestQueryClient } from "@saflib/vue-spa-dev/vitest-helpers";

describe("useQueryTemplate", () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it("should handle successful queries", async () => {
    const { result } = renderHook(() => useQueryTemplate(), {
      global: {
        provide: {
          queryClient,
        },
      },
    });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    expect(result.value.data).toEqual({
      // TODO: Add expected response structure
      // Focus on identifiers and important data fields
      // Avoid asserting on fields that might change frequently
    });
  });

  it("should handle error states", async () => {
    // TODO: Mock API error response
    const { result } = renderHook(() => useQueryTemplate(), {
      global: {
        provide: {
          queryClient,
        },
      },
    });

    await waitFor(() => {
      expect(result.value.isError).toBe(true);
    });

    expect(result.value.error).toBeDefined();
  });
});
