// TODO: remove @ts-expect-error lines as part of workflow
import { createHandler } from "@saflib/express";
import type {
  __ServiceName__ServiceRequestBody,
  __ServiceName__ServiceResponseBody,
} from "template-package-spec";
// @ts-expect-error
import createError from "http-errors";
import { __serviceName__ServiceStorage } from "template-package-service-common";
import { getSafContextWithAuth } from "@saflib/node";
// TODO: Import neccessary db functions and error classes, as well as any other deps
// import { __serviceName__Db } from "template-package-db";

export const __targetName____GroupName__Handler = createHandler(
  async (req, res) => {
    // @ts-expect-error
    const ctx = __serviceName__ServiceStorage.getStore()!;
    // @ts-expect-error
    const { auth } = getSafContextWithAuth();
    // @ts-expect-error
    const data: __ServiceName__ServiceRequestBody["__targetName____GroupName__"] =
      req.body || {};

    // TODO: Call your service/DB function here
    // const { result, error } = await __serviceName__Db.someFunction(ctx.dbKey, {
    //   // Map request data to service parameters
    // });

    // TODO: Handle expected errors
    // if (error) {
    //   switch (true) {
    //     case error instanceof SomeError:
    //       throw createError(400, "Error message");
    //     default:
    //       throw error satisfies never;
    //   }
    // }

    // TODO: Map result to API response
    // @ts-expect-error - TODO: remove ts-expect-error as part of workflow
    const response: __ServiceName__ServiceResponseBody["__targetName____GroupName__"][201] =
      {
        // Map service result to API response, using _helpers.ts mapper function
      };
    // TODO: Set appropriate status code
    res.status(201).json(response);
  },
);
