// TODO: remove @ts-expect-error lines as part of workflow
import { createHandler } from "@saflib/express";
import type {
  __ServiceName__ServiceRequestBody,
  __ServiceName__ServiceResponseBody,
} from "template-package-spec";
import createError from "http-errors";
import { __serviceName__ServiceStorage } from "template-package-service-common";
import { getSafContextWithAuth } from "@saflib/node";
// BEGIN ONCE WORKFLOW AREA uploadImports FOR express/add-handler IF upload
import fs from "fs";
// import { Readable } from "stream";
import { sanitizeFilename } from "@saflib/utils";
// END WORKFLOW AREA
// TODO: Import neccessary db functions and error classes, as well as any other deps
// import { __serviceName__Db } from "template-package-db";

export const __targetName____GroupName__Handler = createHandler(
  async (req, res) => {
    const ctx = __serviceName__ServiceStorage.getStore()!;
    // @ts-expect-error
    const { auth } = getSafContextWithAuth();
    
    // BEGIN ONCE WORKFLOW AREA uploadInput FOR express/add-handler IF upload
    // @ts-expect-error
    const { fileContainer } = ctx; // TODO: use actual container property name (e.g. emptyFormContainer)
    if (!Array.isArray(req.files)) {
      throw createError(400, "No files uploaded");
    }
    const file = req.files.find((f) => f.fieldname === "file");
    if (!file) {
      throw createError(400, "No file uploaded");
    }
    const fileBuffer = await fs.promises.readFile(file.path);
    // @ts-expect-error
    const fileSize = fileBuffer.length;
    try {
      await fs.promises.unlink(file.path);
    } catch {
      // ignore cleanup errors
    }
    // @ts-expect-error
    const blobName = `__groupName__/${Math.random().toString(36).slice(2, 15)}-${sanitizeFilename(file.originalname)}`;
    // END WORKFLOW AREA
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

    // BEGIN ONCE WORKFLOW AREA uploadToStore FOR express/add-handler IF upload
    // TODO: After DB create, upload file to container. On upload failure, clean up DB record and throw 500.
    // const uploadResult = await fileContainer.uploadFile(blobName, Readable.from(fileBuffer), {
    //   mimetype: file.mimetype,
    //   filename: sanitizeFilename(file.originalname),
    //   cacheTime: new Date().toISOString(),
    // });
    // if (uploadResult.error) { ... cleanup result.id ... throw createError(500, "Failed to upload file to storage"); }
    // END WORKFLOW AREA

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
