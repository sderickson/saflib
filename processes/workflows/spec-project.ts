import { SimpleWorkflow } from "@saflib/workflows";
import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

interface SpecProjectWorkflowParams {
  slug: string;
}

export class SpecProjectWorkflow extends SimpleWorkflow<SpecProjectWorkflowParams> {
  name = "spec-project";
  description = "Write a product/technical specification for a project.";

  init = async (slug: string) => {
    this.params = { slug };
    const toLog = [];
    const c = this.computed();

    execSync(`mkdir -p ${c.specFilePath}`);
    toLog.push(`✔ Created directory: ${c.specFilePath}`);

    const templatePath = path.resolve(
      import.meta.dirname,
      "./spec.template.md",
    );
    const templateContent = readFileSync(templatePath, "utf8");

    writeFileSync(c.specFilePath, templateContent);
    toLog.push(`✔ Created spec file: ${c.specFilePath}`);

    this.print(toLog.join("\n"));
    return { data: {} };
  };

  computed = () => {
    return {
      specFilePath: path.join(
        `${new Date().toISOString().split("T")[0]}-${this.getParams().slug}`,
        "spec.md",
      ),
    };
  };

  cliArguments = [
    {
      name: "slug",
      description:
        "kebab-case name of project to use in folder and git branch names and alike",
    },
  ];

  workflowPrompt = () => {
    return `You are writing a product/technical specification for ${this.getParams().slug}.`;
  };

  steps = [
    {
      name: "Fill in the spec",
      prompt: () =>
        `Ask for an overview of the project if you haven't already gotten one, then given that description, fill ${this.computed().specFilePath} which was just created.`,
    },
    {
      name: "Review the spec",
      prompt: () =>
        `Go back and forth with the human on the spec. Have the human make updates and notes in the doc, then review their changes, make your own updates, and repeat until they sign off.`,
    },
  ];
}
