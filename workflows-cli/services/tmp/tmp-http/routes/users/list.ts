// TODO: remove @ts-expect-error lines as part of workflow
import { createHandler } from "@saflib/express";
import type {
  TmpServiceRequestBody,
  TmpServiceResponseBody,
} from "tmp-spec";
// @ts-expect-error
import createError from "http-errors";
import { tmpServiceStorage } from "tmp-service-common";
import { getSafContextWithAuth } from "@saflib/node";
// TODO: Import neccessary db functions and error classes, as well as any other deps
// import { tmpDb } from "tmp-db";

export const listHandler = createHandler(async (req, res) => {
  // @ts-expect-error
  const ctx = tmpServiceStorage.getStore()!;
  // @ts-expect-error
  const { auth } = getSafContextWithAuth();
  // @ts-expect-error
  const data: TmpServiceRequestBody["listUsers"] =
    req.body || {};

  // TODO: Call your service/DB function here
  // const { result, error } = await tmpDb.someFunction(ctx.dbKey, {
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
  const response: TmpServiceResponseBody["listUsers"][201] =
    {
      // Map service result to API response, using _helpers.ts mapper function
    };
  // TODO: Set appropriate status code
  res.status(201).json(response);
});
