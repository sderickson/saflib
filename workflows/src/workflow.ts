import type {
  CLIArgument,
  Result,
  Step,
  WorkflowBlob,
  WorkflowStatus,
} from "./types.ts";
import type { AnyStateMachine, AnyActor } from "xstate";
import { addNewLinesToString } from "./utils.ts";
import { createActor, waitFor } from "xstate";
import { allChildrenSettled } from "../sample/xstate-shared.ts";
// The following is TS magic to describe a class constructor that implements the abstract SimpleWorkflow class.
type AbstractClassConstructor<T extends Workflow> = new (...args: any[]) => T;

export type ConcreteWorkflow = AbstractClassConstructor<Workflow>;

export interface WorkflowMeta {
  name: string;
  description: string;
  cliArguments: CLIArgument[];
  Workflow: ConcreteWorkflow;
}

export abstract class Workflow {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly cliArguments: CLIArgument[];
  abstract init: (...args: any[]) => Promise<Result<any>>;
  abstract kickoff(): Promise<boolean>;
  abstract printStatus(): Promise<void>;
  abstract goToNextStep(): Promise<void>;
  abstract dehydrate(): WorkflowBlob;
  abstract hydrate(blob: WorkflowBlob): void;
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
    console.log("");
    console.log(addNewLinesToString(message));
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
}

export abstract class XStateWorkflow extends Workflow {
  abstract readonly machine: AnyStateMachine;
  private input: any;
  private actor: AnyActor | undefined;

  get name() {
    return this.machine.id;
  }

  init = async (...args: any[]): Promise<Result<any>> => {
    if (args.length !== this.cliArguments.length + 2) {
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
    this.input = input;

    return { data: undefined };
  };

  kickoff = async (): Promise<boolean> => {
    const actor = createActor(this.machine, { input: this.input });
    actor.start();
    await waitFor(actor, allChildrenSettled);
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
    if (!this.actor) {
      throw new Error("Workflow not started");
    }
    this.actor.send({ type: "continue" });
    await waitFor(this.actor, allChildrenSettled);
  };
  dehydrate = (): WorkflowBlob => {
    return {
      workflowName: this.name,
      internalState: this.actor?.getPersistedSnapshot(),
    };
  };
  hydrate = (blob: WorkflowBlob): void => {
    this.actor = createActor(this.machine, { snapshot: blob.internalState });
  };
}
