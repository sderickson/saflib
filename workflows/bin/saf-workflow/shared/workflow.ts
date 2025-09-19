import type {
  WorkflowArgument,
  ChecklistItem,
  WorkflowOutput,
  WorkflowDefinition,
  WorkflowRunMode,
  WorkflowContext,
} from "../../../core/types.ts";
import type { WorkflowBlob } from "./types.ts";
import type { AnyStateMachine, AnyActor } from "xstate";
import { createActor } from "xstate";
import { getWorkflowLogger } from "../../../core/store.ts";
import {
  workflowAllSettled,
  continueWorkflow,
  pollingWaitFor,
  promptWorkflow,
} from "../../../core/utils.ts";
import { makeWorkflowMachine } from "../../../core/make.ts";

// The following is TS magic to describe a class constructor that implements the Workflow class.
type AbstractClassConstructor<T extends AbstractWorkflowRunner> = new (
  ...args: any[]
) => T;

/**
 * A concrete subclass of XStateWorkflowRunner. Packages which export workflows should use this to type the array of workflow classes. This is the type which the CLI tool accepts to provide a list of workflows.
 */
export type ConcreteWorkflowRunner =
  AbstractClassConstructor<AbstractWorkflowRunner>;

/**
 * Abstract superclass for XStateWorkflow. Can probably be removed since SimpleWorkflows are gone.
 */
export abstract class AbstractWorkflowRunner {
  abstract kickoff(): Promise<boolean>;
  abstract printStatus(): Promise<void>;
  abstract getCurrentStateName(): string;
  abstract goToNextStep(): Promise<void>;
  abstract dehydrate(): WorkflowBlob;
  abstract hydrate(blob: WorkflowBlob): void;
  abstract done(): boolean;
  abstract getChecklist(): ChecklistItem;
  abstract getError(): Error | undefined;
  abstract getOutput(): WorkflowOutput | undefined;
}

interface XStateWorkflowOptions<I extends readonly WorkflowArgument[], C> {
  definition: WorkflowDefinition<I, C>;
  args?: string[];
  workflowRunMode?: WorkflowRunMode;
}

/**
 * A class used to load and run the workflow, managing XState events and I/O operations. This is an abstract super class and should be subclassed with the WorkflowDefinition and other properties set. Those subclasses are what the CLI tool uses to create and run workflows.
 *
 * To use, subclass it with:
 * * machine - the XState machine for the workflow.
 * * sourceUrl - import.meta.url
 * * description - to show up in the CLI tool
 * * cliArguments - to show up in the CLI tool
 */
export class XStateWorkflowRunner extends AbstractWorkflowRunner {
  private machine: AnyStateMachine;
  private input: { [key: string]: string } & { runMode?: WorkflowRunMode };
  private args: string[];
  private actor: AnyActor | undefined;
  definition: WorkflowDefinition<any, any>;

  constructor(options: XStateWorkflowOptions<any, any>) {
    super();
    this.definition = options.definition;
    this.input = {};
    this.args = options.args || [];
    const inputLength = options.args?.length || 0;
    const expectedInputLength = this.definition.input.length;
    if (expectedInputLength !== inputLength) {
      throw new Error(
        `Expected ${expectedInputLength} arguments, got ${inputLength}`,
      );
    }
    for (let i = 0; i < expectedInputLength; i++) {
      const arg = this.definition.input[i];
      this.input[arg.name] = options.args?.[i] || "";
    }

    this.input.runMode = options.workflowRunMode;
    this.machine = makeWorkflowMachine(this.definition);
  }

  kickoff = async (): Promise<boolean> => {
    const actor = createActor(this.machine, { input: this.input });
    actor.start();
    const snapshot = actor.getSnapshot();
    if (snapshot.status === "error") {
      console.log("Actor started with error", snapshot.error);
      return false;
    }
    await pollingWaitFor(actor, workflowAllSettled);
    this.actor = actor;
    return actor.getSnapshot().status !== "error";
  };

  printStatus = async (): Promise<void> => {
    const log = getWorkflowLogger();
    if (!this.actor) {
      log.error("Workflow not started");
      return;
    }
    if (this.actor.getSnapshot().status === "error") {
      log.error("Workflow has errored. And could not continue.");
      return;
    }
    if (this.actor.getSnapshot().status === "done") {
      log.info("Workflow has been completed.");
      return;
    }
    log.info("In-progress workflow loaded.");
    const snapshot = this.actor.getPersistedSnapshot() as unknown as {
      context: WorkflowContext;
    };
    if (snapshot.context && snapshot.context.checklist.length > 0) {
      console.log("");
      console.log("Completed work:");

      snapshot.context.checklist.forEach((item) =>
        console.log(`- ${item.description}`),
      );
      console.log("");
    }

    console.log("Prompt for next step:");
    promptWorkflow(this.actor);
    await pollingWaitFor(this.actor, workflowAllSettled);
  };

  goToNextStep = async (): Promise<void> => {
    const log = getWorkflowLogger();
    if (!this.actor) {
      throw new Error("Workflow not started");
    }
    if (this.actor.getSnapshot().status === "error") {
      log.error("This workflow has errored. And could not continue.");
      return;
    }

    continueWorkflow(this.actor);
    await pollingWaitFor(this.actor, workflowAllSettled);

    if (this.actor.getSnapshot().status === "done") {
      console.log("\n--- This workflow has been completed. ---\n");
      return;
    }
  };

  dehydrate = (): WorkflowBlob => {
    return {
      workflowName: this.machine.id,
      workflowSourceUrl: this.definition.sourceUrl,
      args: this.args,
      snapshotState: this.actor?.getPersistedSnapshot(),
    };
  };

  hydrate = (blob: WorkflowBlob): void => {
    this.actor = createActor(this.machine, {
      snapshot: blob.snapshotState,
    });
    this.actor.start();
  };

  done = (): boolean => {
    if (!this.actor) {
      return false;
    }
    return this.actor.getSnapshot().status === "done";
  };

  getChecklist = (): ChecklistItem => {
    if (!this.actor) {
      return { description: "" };
    }
    return this.actor.getSnapshot().output.checklist;
  };

  getOutput = (): WorkflowOutput | undefined => {
    if (!this.actor) {
      return undefined;
    }
    return this.actor.getSnapshot().output;
  };

  getCurrentStateName = (): string => {
    if (!this.actor) {
      return "not started";
    }
    return this.actor.getSnapshot().value;
  };

  getError = (): Error | undefined => {
    if (!this.actor) {
      return undefined;
    }
    return this.actor.getSnapshot().error;
  };
}
