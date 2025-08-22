import type {
  CLIArgument,
  ChecklistItem,
  Result,
  Step,
  WorkflowBlob,
  WorkflowStatus,
} from "./types.ts";
import type { AnyStateMachine, AnyActor } from "xstate";
import { addNewLinesToString, allChildrenSettled } from "./utils.ts";
import { createActor, waitFor } from "xstate";
import { getSafReporters } from "@saflib/node";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { WorkflowContext, WorkflowInput } from "./xstate.ts";
// The following is TS magic to describe a class constructor that implements the abstract SimpleWorkflow class.
type AbstractClassConstructor<T extends Workflow> = new (...args: any[]) => T;

export type ConcreteWorkflow = AbstractClassConstructor<Workflow>;

export interface WorkflowMeta {
  name: string;
  description: string;
  cliArguments: CLIArgument[];
  Workflow: ConcreteWorkflow;
  packageName: string;
}

export abstract class Workflow {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly cliArguments: CLIArgument[];
  abstract readonly sourceUrl: string;
  abstract init: (...args: any[]) => Promise<Result<any>>;
  abstract kickoff(): Promise<boolean>;
  abstract printStatus(): Promise<void>;
  abstract getCurrentStateName(): string;
  abstract goToNextStep(): Promise<void>;
  abstract dehydrate(): WorkflowBlob;
  abstract hydrate(blob: WorkflowBlob): void;
  abstract done(): boolean;
  abstract getChecklist(): ChecklistItem[];
  abstract getError(): Error | undefined;
}

export abstract class SimpleWorkflow<
  P extends Record<string, any>,
  D extends Record<string, any> = {},
> extends Workflow {
  params?: P;
  data?: D;

  abstract init: (...args: any[]) => Promise<Result<D>>;
  abstract steps: Step[];
  abstract workflowPrompt: () => string;
  private stepIndex = 0;
  private status: WorkflowStatus = "not started";

  getData(): D {
    if (!this.data) {
      throw new Error(`Data is not set for workflow ${this.constructor.name}`);
    }
    return this.data;
  }

  getParams(): P {
    if (!this.params) {
      throw new Error(
        `Params are not set for workflow ${this.constructor.name}`,
      );
    }
    return this.params;
  }

  setData(data: D) {
    this.data = data;
  }

  print(message: string) {
    const { log } = getSafReporters();
    log.info("");
    log.info(addNewLinesToString(message));
  }

  async kickoff(): Promise<boolean> {
    if (this.status === "completed") {
      return true;
    }
    this.status = "in progress";
    this.print(`The "${this.name}" workflow has been kicked off.`);
    await this.printStatus();
    this.print(`To continue, run "npm exec saf-workflow next"`);
    return true;
  }

  async printStatus() {
    if (this.status === "completed") {
      this.print("The workflow has been completed.");
      return;
    }
    if (this.status === "not started") {
      this.print("The workflow has not started yet.");
      return;
    }
    this.print(this.workflowPrompt());
    this.print(this.steps[this.stepIndex].prompt());
  }

  async goToNextStep() {
    if (this.status === "completed") {
      this.print("The workflow has already been completed.");
      return;
    }
    this.stepIndex++;
    if (this.stepIndex >= this.steps.length) {
      this.status = "completed";
      this.print(`The workflow has been completed.`);
      return;
    }
    this.print(
      `The workflow has moved to step "${this.steps[this.stepIndex].name}".`,
    );
    await this.printStatus();
  }

  dehydrate(): WorkflowBlob {
    return {
      workflowName: this.name,
      internalState: {
        status: this.status,
        stepIndex: this.stepIndex,
        data: this.data ?? {},
        params: this.params ?? {},
      },
    };
  }

  hydrate(blob: WorkflowBlob): void {
    if (typeof blob !== "object" || blob === null) {
      throw new Error("Invalid serialized data: not an object");
    }
    if (!blob.internalState) {
      throw new Error("Invalid serialized data: no internal state");
    }
    if (
      !["not started", "in progress", "completed"].includes(
        blob.internalState.status,
      )
    ) {
      throw new Error(`Invalid status: ${blob.internalState.status}`);
    }
    if (typeof blob.internalState.stepIndex !== "number") {
      throw new Error("Invalid stepIndex: not a number");
    }
    this.params = blob.internalState.params as any;
    this.data = blob.internalState.data as any;
    this.stepIndex = blob.internalState.stepIndex;
    this.status = blob.internalState.status;
  }

  done = (): boolean => {
    return this.status === "completed";
  };

  getChecklist = (): ChecklistItem[] => {
    return [];
  };

  getCurrentStateName = (): string => {
    const currentStep = this.steps[this.stepIndex];
    return currentStep.name;
  };

  getError = (): Error | undefined => {
    return undefined;
  };
}

interface XStateWorkflowOptions {
  dryRun?: boolean;
}

export abstract class XStateWorkflow extends Workflow {
  abstract readonly machine: AnyStateMachine;
  private input: any;
  private actor: AnyActor | undefined;

  get name() {
    return this.machine.id;
  }

  init = async (
    options: XStateWorkflowOptions,
    ...args: string[]
  ): Promise<Result<any>> => {
    if (args.length !== this.cliArguments.length) {
      return {
        error: new Error(
          `Expected ${this.cliArguments.length} arguments, got ${args.length}`,
        ),
      };
    }
    const input = {} as any;
    for (let i = 0; i < this.cliArguments.length; i++) {
      input[this.cliArguments[i].name] = args[i];
    }
    input.dryRun = options.dryRun;
    this.input = input;

    return { data: undefined };
  };

  kickoff = async (): Promise<boolean> => {
    const actor = createActor(this.machine, { input: this.input });
    actor.start();
    const snapshot = actor.getSnapshot();
    if (snapshot.status === "error") {
      console.log("Actor started with error", snapshot.error);
      return false;
    }
    await waitFor(actor, allChildrenSettled);
    const { log } = getSafReporters();
    log.info("");
    log.info("To continue, run 'npm exec saf-workflow next'");
    this.actor = actor;
    return actor.getSnapshot().status !== "error";
  };

  printStatus = async (): Promise<void> => {
    if (!this.actor) {
      throw new Error("Workflow not started");
    }
    this.actor.send({ type: "prompt" });
    await waitFor(this.actor, allChildrenSettled);
  };

  goToNextStep = async (): Promise<void> => {
    const { log } = getSafReporters();
    if (!this.actor) {
      throw new Error("Workflow not started");
    }
    if (this.actor.getSnapshot().status === "error") {
      log.error("This workflow has errored. And could not continue.");
      return;
    }

    this.actor.send({ type: "continue" });
    await waitFor(this.actor, allChildrenSettled);

    if (this.actor.getSnapshot().status === "done") {
      log.info("\nThis workflow has been completed.\n");
      return;
    }
  };

  dehydrate = (): WorkflowBlob => {
    return {
      workflowName: this.name,
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

  getChecklist = (): ChecklistItem[] => {
    if (!this.actor) {
      return [];
    }
    return this.actor.getSnapshot().output.checklist;
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

export function getPackageName(rootUrl: string) {
  if (!rootUrl.startsWith("file://")) {
    throw new Error("Root URL should be import.meta.url");
  }
  const rootPath = path.dirname(rootUrl.replace("file://", ""));
  let currentDir = rootPath;
  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return packageJson.name;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("package.json not found");
    }
    currentDir = parentDir;
  }
}

export function contextFromInput(input: WorkflowInput): WorkflowContext {
  return {
    checklist: [],
    loggedLast: false,
    dryRun: input.dryRun,
  };
}
