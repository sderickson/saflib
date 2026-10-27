import type { Handler, Request } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { sanitizeFilename } from "@saflib/utils";

export const uploadToDiskOptions: multer.Options = {
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tmpdir());
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${randomUUID()}-${sanitizeFilename(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
};

function uploadedFilePaths(req: Request): string[] {
  const files = req.files
    ? Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat()
    : [];
  return [...files, ...(req.file ? [req.file] : [])]
    .map((file) => file.path)
    .filter((path): path is string => typeof path === "string" && !!path);
}

/**
 * Delete disk-stored uploads once the response is done. Multer writes files
 * before auth and validation run, so a rejected request (401, 403, 4xx) would
 * otherwise leave them in the temp dir for good. Handlers must finish with
 * their temp files before responding; moved files are skipped (ENOENT).
 */
export const cleanupUploadedFiles: Handler = (req, res, next) => {
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    for (const path of uploadedFilePaths(req)) {
      void unlink(path).catch(() => undefined);
    }
  };
  res.on("finish", cleanup);
  res.on("close", cleanup);
  next();
};
