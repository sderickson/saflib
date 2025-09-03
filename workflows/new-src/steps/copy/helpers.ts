import type { DoneActorEvent, OutputFrom } from "xstate";
import type { CopyTemplateMachineContext } from "./types.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { getGitHubUrl } from "@saflib/dev-tools";

export const parseChecklist = ({
  context,
  event,
}: {
  context: CopyTemplateMachineContext;
  event: DoneActorEvent<OutputFrom<typeof copyNextFile>, string>;
}) => {
  const fileId = context.filesToCopy[0];
  const fullPath = context.templateFiles![fileId];
  const githubPath = getGitHubUrl(fullPath);
  return [
    ...context.checklist,
    {
      description: `Upsert **${event.output.fileName}** from [template](${githubPath})`,
    },
  ];
};

export const parseCopiedFiles = ({
  context,
  event,
}: {
  context: CopyTemplateMachineContext;
  event: DoneActorEvent<OutputFrom<typeof copyNextFile>, string>;
}) => {
  return {
    ...context.copiedFiles,
    [event.output.fileId]: event.output.filePath,
  };
};
