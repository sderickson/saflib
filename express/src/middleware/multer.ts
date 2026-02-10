import multer from "multer";
import { randomUUID } from "crypto";
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
