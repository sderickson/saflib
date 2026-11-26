import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { MutationObserver, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { useRefreshOpsAfterMutations } from "./useRefreshOpsAfterMutations.ts";

describe("useRefreshOpsAfterMutations", () => {
  it("invalidates the digest after any successful mutation, not after failures", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const app = createApp({});
    app.use(VueQueryPlugin, { queryClient });
    const scope = effectScope();
    app.runWithContext(() => scope.run(() => useRefreshOpsAfterMutations()));

    await new MutationObserver(queryClient, { mutationFn: async () => "ok" }).mutate().catch(() => {});
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ops", "digest"] });

    invalidate.mockClear();
    await new MutationObserver(queryClient, { mutationFn: async () => { throw new Error("no"); } }).mutate().catch(() => {});
    expect(invalidate).not.toHaveBeenCalled();
    scope.stop();
  });
});
