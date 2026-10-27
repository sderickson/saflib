import { describe, expect, it } from "vitest";
import express from "express";
import multer from "multer";
import request from "supertest";
import { existsSync } from "fs";
import { cleanupUploadedFiles, uploadToDiskOptions } from "./multer.ts";

describe("cleanupUploadedFiles", () => {
  it("deletes temp uploads after a rejected request", async () => {
    let tempPath: string | undefined;
    const app = express();
    app.post(
      "/upload",
      cleanupUploadedFiles,
      multer(uploadToDiskOptions).any(),
      (req, res) => {
        tempPath = (req.files as Express.Multer.File[])[0]?.path;
        res.status(401).json({ message: "Unauthorized" });
      },
    );

    await request(app)
      .post("/upload")
      .attach("file", Buffer.from("not allowed"), "rejected.txt")
      .expect(401);

    expect(tempPath).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(existsSync(tempPath!)).toBe(false);
  });
});
