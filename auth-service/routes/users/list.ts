import { Request, Response } from "express";
import { AuthResponse } from "@saflib/auth-spec";

export const listUsersHandler = async (req: Request, res: Response) => {
  res.json([] satisfies AuthResponse["listUsers"]["200"]);
};
