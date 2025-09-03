import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createActor, waitFor } from "xstate";
import { CopyTemplateMachine } from "./copy-template-machine.ts";
import { allSettled } from "../utils.ts";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import path from "node:path";

describe("CopyTemplateMachine", () => {
  const testDir = path.join(process.cwd(), "test-temp");
  const sourceDir = path.join(testDir, "source");
  const targetDir = path.join(testDir, "target");

  beforeEach(async () => {
    // Create test directories
    await mkdir(sourceDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });

    // Create test template files
    await writeFile(
      path.join(sourceDir, "template-file.ts"),
      `export class TemplateFile {
  name = "template-file";
  snake_name = "template_file";
}`,
    );

    await writeFile(
      path.join(sourceDir, "TemplateFile.vue"),
      `<template>
  <div>{{ templateFile }}</div>
</template>

<script>
export default {
  name: "TemplateFile"
}
</script>`,
    );
  });

  afterEach(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true });
  });

  it.skip("should copy and rename template files correctly", async () => {
    const actor = createActor(CopyTemplateMachine, {
      input: {
        sourceDir: sourceDir,
        targetDir: targetDir,
        name: "foo-bar",
      },
    });

    actor.start();
    await waitFor(actor, allSettled);

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("done");

    // Check that files were copied and renamed
    const fooBarTs = await readFile(
      path.join(targetDir, "foo-bar.ts"),
      "utf-8",
    );
    expect(fooBarTs).toContain("export class FooBar {");
    expect(fooBarTs).toContain('name = "foo-bar";');
    expect(fooBarTs).toContain('snake_name = "foo_bar";');

    const FooBarVue = await readFile(
      path.join(targetDir, "FooBar.vue"),
      "utf-8",
    );
    expect(FooBarVue).toContain("{{ fooBar }}");
    expect(FooBarVue).toContain('name: "FooBar"');
  });

  it.skip("should skip existing files and log warning", async () => {
    // Create an existing file
    await writeFile(path.join(targetDir, "foo-bar.ts"), "existing content");

    const actor = createActor(CopyTemplateMachine, {
      input: {
        sourceDir: sourceDir,
        targetDir: targetDir,
        name: "foo-bar",
      },
    });

    actor.start();
    await waitFor(actor, allSettled);

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("done");

    // Check that existing file was not overwritten
    const existingFile = await readFile(
      path.join(targetDir, "foo-bar.ts"),
      "utf-8",
    );
    expect(existingFile).toBe("existing content");
  });
});
