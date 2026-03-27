import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import {
  isKratosSecurityCsrfResponseBody,
  resultFromKratosGetFlowHttpError,
} from "./get-flow-query-error.ts";
import { FlowGone, SecurityCsrfViolation, UnhandledResponse } from "./flow-results.ts";

function axiosErr(status: number, data: unknown) {
  const e = new AxiosError("x");
  e.response = { status, data } as never;
  return e;
}

describe("isKratosSecurityCsrfResponseBody", () => {
  it("detects Kratos CSRF JSON", () => {
    expect(
      isKratosSecurityCsrfResponseBody({
        error: { id: "security_csrf_violation", code: 403 },
      }),
    ).toBe(true);
    expect(isKratosSecurityCsrfResponseBody({})).toBe(false);
  });
});

describe("resultFromKratosGetFlowHttpError", () => {
  it("maps 410 to FlowGone", () => {
    const r = resultFromKratosGetFlowHttpError(axiosErr(410, { message: "gone" }));
    expect(r).toBeInstanceOf(FlowGone);
  });

  it("maps 403 CSRF to SecurityCsrfViolation", () => {
    const body = { error: { id: "security_csrf_violation" } };
    const r = resultFromKratosGetFlowHttpError(axiosErr(403, body));
    expect(r).toBeInstanceOf(SecurityCsrfViolation);
    expect((r as SecurityCsrfViolation).data).toEqual(body);
  });

  it("maps other 4xx to UnhandledResponse", () => {
    const r = resultFromKratosGetFlowHttpError(axiosErr(404, { x: 1 }));
    expect(r).toBeInstanceOf(UnhandledResponse);
    expect((r as UnhandledResponse).status).toBe(404);
  });

  it("returns undefined for 5xx", () => {
    expect(resultFromKratosGetFlowHttpError(axiosErr(500, {}))).toBeUndefined();
  });
});
