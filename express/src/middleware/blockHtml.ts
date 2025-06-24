import type { Request, Response, NextFunction } from "express";

export const blockHtml = (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const stringBody = JSON.stringify(body);
  const result = /<[^>]*>/.test(stringBody);
  if (result) {
    res.status(400).json({ error: "HTML is not allowed" });
    return;
  }
  next();
};
