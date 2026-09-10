import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { kratosSubmitErrorMessage } from "./kratosErrorMessage.ts";

describe("kratosSubmitErrorMessage", () => {
  it("uses axios message for object response bodies", () => {
    const err = new AxiosError("Request failed");
    err.response = {
      status: 500,
      data: { foo: 1 },
    } as AxiosError["response"];
    expect(kratosSubmitErrorMessage(err, "fallback")).toBe("Request failed");
  });

  it("stringifies primitive axios response data", () => {
    const err = new AxiosError("fail");
    err.response = { status: 500, data: "plain" } as AxiosError["response"];
    expect(kratosSubmitErrorMessage(err, "fallback")).toBe("plain");
  });

  it("uses Error message or fallback", () => {
    expect(kratosSubmitErrorMessage(new Error("e"), "f")).toBe("e");
    expect(kratosSubmitErrorMessage(null, "f")).toBe("f");
  });
});
