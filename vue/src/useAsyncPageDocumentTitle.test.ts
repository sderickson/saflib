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
    configureAppDocumentTitle("ExampleApp");
    const scope = effectScope();
    scope.run(() => {
      useAsyncPageDocumentTitle("Matters");
    });
    scope.stop();

    expect(document.title).toBe("Matters — ExampleApp");
  });

  it("prepends loader detail when it becomes available", async () => {
    configureAppDocumentTitle("ExampleApp");
    const matterName = ref<string | null>(null);
    const scope = effectScope();

    scope.run(() => {
      useAsyncPageDocumentTitle(
        "Review",
        computed(() => matterName.value),
      );
    });

    expect(document.title).toBe("Review — ExampleApp");

    matterName.value = "Immigration Case A";
    await Promise.resolve();

    expect(document.title).toBe(
      "Immigration Case A — Review — ExampleApp",
    );

    scope.stop();
  });
});
