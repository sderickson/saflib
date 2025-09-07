import type { DoneActorEvent, OutputFrom } from "xstate";
import type { CopyStepContext } from "./types.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { getSourceUrl } from "../../store.ts";

export const parseChecklist = ({
  context,
  event,
}: {
  context: CopyStepContext;
  event: DoneActorEvent<OutputFrom<typeof copyNextFile>, string>;
}) => {
  const fileId = context.filesToCopy[0];
  const fullPath = context.templateFiles![fileId];
  const githubPath = getSourceUrl(fullPath);
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
  context: CopyStepContext;
  event: DoneActorEvent<OutputFrom<typeof copyNextFile>, string>;
}) => {
  return {
    ...context.copiedFiles,
    [event.output.fileId]: event.output.filePath,
  };
};
