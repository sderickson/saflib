import { createHandler } from "@saflib/express";
import type { ApiRequest, ApiResponseBody } from "@your-org/specs-apis";
import createError from "http-errors";
import { callerServiceStorage } from "@your-org/services-api/context.ts";
import { getSafContextWithAuth } from "@saflib/node";

export const routeTemplate = createHandler(async (req, res) => {
  const ctx = callerServiceStorage.getStore()!;
  const { auth } = getSafContextWithAuth();
  const data: RouteTemplateRequest = req.body || {};

  // TODO: Call your service/DB function here
  // const { result, error } = await yourService.someFunction(ctx.dbKey, {
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
  // const response: ApiResponseBody["routeTemplate"][201] = {
  //   // Map service result to API response
  // };

  // TODO: Set appropriate status code
  // res.status(201).json(response);
});
