import { describe, expect, it, vi } from "vitest";
import { createTanstackQueryClient, SILENCE_ERROR_SNACKBAR } from "./client.ts";
import { TanstackError } from "./errors.ts";

describe("createTanstackQueryClient", () => {
  it("reports failed mutations to onMutationError", async () => {
    const onMutationError = vi.fn();
    const client = createTanstackQueryClient({ onMutationError });
    const error = new TanstackError(400);
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(error),
    });

    await expect(mutation.execute(undefined)).rejects.toBe(error);
    expect(onMutationError).toHaveBeenCalledWith(error, mutation);
  });

  it("skips mutations that silence the snackbar", async () => {
    const onMutationError = vi.fn();
    const client = createTanstackQueryClient({ onMutationError });
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(new TanstackError(400)),
      meta: { [SILENCE_ERROR_SNACKBAR]: true },
    });

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(
      TanstackError,
    );
    expect(onMutationError).not.toHaveBeenCalled();
  });
});
