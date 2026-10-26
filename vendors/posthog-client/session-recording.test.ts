import { describe, expect, it } from "vitest";
import {
  makeSessionRecordingTextMasker,
  sessionRecordingMaskingOptions,
} from "./session-recording.ts";

describe("makeSessionRecordingTextMasker", () => {
  it("keeps known UI strings and masks everything else", () => {
    const mask = makeSessionRecordingTextMasker(new Map([["Save", "common.save"]]));
    expect(mask("Save")).toBe("Save");
    expect(mask("Jane Doe")).toBe("********");
  });
});

describe("sessionRecordingMaskingOptions", () => {
  it("masks all text, with asterisks by default", () => {
    const options = sessionRecordingMaskingOptions();
    expect(options.session_recording?.maskTextSelector).toBe("*");
    expect(options.session_recording?.maskTextFn?.("abc")).toBe("***");
  });
});
