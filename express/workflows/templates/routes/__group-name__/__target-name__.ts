// TODO: remove @ts-expect-error lines as part of workflow
import { createHandler } from "@saflib/express";
import type {
  __ServiceName__ServiceRequestBody,
  __ServiceName__ServiceResponseBody,
} from "template-package-spec";
import { getSafContextWithAuth } from "@saflib/node";
// BEGIN ONCE WORKFLOW AREA uploadImports FOR express/add-handler IF upload
import { __serviceName__ServiceStorage } from "template-package-service-common";
import createError from "http-errors";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import { Readable } from "stream";
import { sanitizeFilename } from "@saflib/utils";
// END WORKFLOW AREA
// TODO: Import neccessary db functions and error classes, as well as any other deps
// import { __serviceName__Db } from "template-package-db";

export const __targetName____GroupName__Handler = createHandler(
  async (req, res) => {
    // @ts-expect-error
    const { auth } = getSafContextWithAuth();
    
    // BEGIN ONCE WORKFLOW AREA uploadInput FOR express/add-handler IF upload
    const ctx = __serviceName__ServiceStorage.getStore()!;
    const { __storeName__ } = ctx;

    // req.files may be an array (multer .any()) or a keyed object (multer .fields()).
    // Extract the file whose fieldname matches the spec (e.g. "file").
    const files = Array.isArray(req.files) ? req.files : req.files?.file;
    const file = Array.isArray(files)
      ? files.find((f: { fieldname: string }) => f.fieldname === "file") ?? files[0]
      : files;
    if (!file || !("path" in file) || typeof file.path !== "string") {
      throw createError(400, "No file uploaded");
    }
    const multerFile = file as { path: string; originalname: string; mimetype: string; size: number };

    const blobName = `__groupName__/${crypto.randomUUID()}`;
    // @ts-expect-error
    const fileSize = multerFile.size;
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
    const stream: Readable = createReadStream(multerFile.path);
    const uploadResult = await __storeName__.uploadFile(blobName, stream, {
      mimetype: multerFile.mimetype || "application/octet-stream",
      filename: sanitizeFilename(multerFile.originalname),
    });

    try {
      await unlink(multerFile.path);
    } catch {
      // ignore temp-file cleanup errors
    }

    if (uploadResult.error) {
      // TODO: clean up the DB record created above (e.g. deleteX(dbKey, result.id))
      throw createError(500, "Failed to upload file to storage", {
        code: "FILE_UPLOAD_FAILED",
      });
    }
    // END WORKFLOW AREA

    // TODO: Map result to API response
    // @ts-expect-error - TODO: remove ts-expect-error as part of workflow
    const response: __ServiceName__ServiceResponseBody["__targetName____GroupName__"][201] =
      {
        // Map service result to API response, using _helpers.ts mapper function
      };
    // BEGIN ONCE WORKFLOW AREA responseBody FOR express/add-handler IF download
    // TODO: obtain buffer from store readFile or generated content; set Content-Type to match spec
    const buffer = Buffer.from([]);
    res.status(200).contentType("application/octet-stream").send(buffer);
    // ELSE
    // TODO: Set appropriate status code
    res.status(201).json(response);
    // END WORKFLOW AREA
  },
);
