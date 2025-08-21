import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createActor, waitFor } from "xstate";
import {
  CopyTemplateMachine,
  updateTemplateFileFactory,
} from "./copy-template-machine.ts";
import type { TemplateWorkflowContext } from "./types.ts";
import { allChildrenSettled } from "../utils.ts";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { setup } from "xstate";
import { workflowActionImplementations, workflowActors } from "../xstate.ts";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

interface TestContext extends TemplateWorkflowContext {
  testFile: string;
}

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

  it("should copy and rename template files correctly", async () => {
    const actor = createActor(CopyTemplateMachine, {
      input: {
        sourceDir: sourceDir,
        targetDir: targetDir,
        name: "foo-bar",
      },
    });

    actor.start();
    await waitFor(actor, allChildrenSettled);

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

  it("should skip existing files and log warning", async () => {
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
    await waitFor(actor, allChildrenSettled);

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

describe("updateTemplateFileFactory", () => {
  const testFilePath = path.join(process.cwd(), "test-file.txt");

  beforeEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it("should continue to next state when file has no TODOs", async () => {
    writeFileSync(testFilePath, "This is a test file with no todos");

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActionImplementations,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateFileFactory({
          filePath: "test-file.txt",
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });
    await waitFor(actor, (state) => state.matches("done"));

    expect(actor.getSnapshot().value).toBe("done");
  });

  it("should stay in current state when file has TODOs", async () => {
    writeFileSync(
      testFilePath,
      "This is a test file with TODO: implement this",
    );

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActionImplementations,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateFileFactory({
          filePath: "test-file.txt",
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });

    // Wait a bit to ensure the state machine has processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(actor.getSnapshot().value).toBe("testState");
  });

  it("should work with function-based filePath", async () => {
    writeFileSync(testFilePath, "This is a test file with no todos");

    const testMachine = setup({
      types: {
        context: {} as TestContext,
      },
      actions: workflowActionImplementations,
      actors: workflowActors,
    }).createMachine({
      id: "test",
      initial: "testState",
      context: {
        testFile: testFilePath,
        loggedLast: false,
        name: "test",
        pascalName: "Test",
        targetDir: testFilePath,
        sourceDir: testFilePath,
      },
      states: {
        ...updateTemplateFileFactory({
          filePath: (context: TestContext) => context.testFile,
          promptMessage: "Please update the test file",
          stateName: "testState",
          nextStateName: "done",
        }),
        done: {
          type: "final",
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    actor.send({ type: "continue" });
    await waitFor(actor, (state) => state.matches("done"));

    expect(actor.getSnapshot().value).toBe("done");
  });
});
