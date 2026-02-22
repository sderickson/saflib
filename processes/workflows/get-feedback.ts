import { PromptStepMachine } from "@saflib/workflows";
import { step } from "@saflib/workflows";

export const GetFeedbackStep = step(PromptStepMachine, () => ({
  promptText: `Thanks for going through this workflow! Please summarize how it went overall, in particular whether you ran into any snags, what they were, and what might be improved. Your feedback is appreciated!`,
}));
