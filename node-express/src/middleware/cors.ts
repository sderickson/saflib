import cors from "cors";
import { Router } from "express";

const domains = [process.env.DOMAIN];

const subdomains = ["", "www.", "specs.api."];

const protocol = process.env.PROTOCOL;

const whitelist = new Set(
  domains.flatMap((domain) =>
    subdomains.map((subdomain) => `${protocol}://${subdomain}${domain}`),
  ),
);

export const corsRouter = Router();
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (whitelist.has(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  maxAge: 600,
});
corsRouter.options("*", corsMiddleware);
corsRouter.use(corsMiddleware);
