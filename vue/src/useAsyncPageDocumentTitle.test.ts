import { afterEach, describe, expect, it } from "vitest";
import { computed, effectScope, ref } from "vue";
import { configureAppDocumentTitle } from "./document-title.ts";
import { useAsyncPageDocumentTitle } from "./useAsyncPageDocumentTitle.ts";

describe("useAsyncPageDocumentTitle", () => {
  afterEach(() => {
    configureAppDocumentTitle("App");
    document.title = "App";
  });

  it("sets the static page title immediately", () => {
    configureAppDocumentTitle("CaseDaemon");
    const scope = effectScope();
    scope.run(() => {
      useAsyncPageDocumentTitle("Matters");
    });
    scope.stop();

    expect(document.title).toBe("Matters — CaseDaemon");
  });

  it("prepends loader detail when it becomes available", async () => {
    configureAppDocumentTitle("CaseDaemon");
    const matterName = ref<string | null>(null);
    const scope = effectScope();

    scope.run(() => {
      useAsyncPageDocumentTitle(
        "Review",
        computed(() => matterName.value),
      );
    });

    expect(document.title).toBe("Review — CaseDaemon");

    matterName.value = "Immigration Case A";
    await Promise.resolve();

    expect(document.title).toBe(
      "Immigration Case A — Review — CaseDaemon",
    );

    scope.stop();
  });
});
