import { Logger } from "winston";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
    }
  }
}

export {};
