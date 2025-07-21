import cors from "cors";
import { Router } from "express";

const domains = [process.env.DOMAIN];

const subdomains = ["", "auth", "onboarding"]; // TODO: draw this from the env

const protocol = process.env.PROTOCOL;

const whitelist = new Set(
  domains.flatMap((domain) =>
    subdomains.map(
      (subdomain) =>
        `${protocol}://${subdomain === "" ? "" : subdomain + "."}${domain}`,
    ),
  ),
);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (whitelist.has(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  maxAge: 600,
});

export const corsRouter = Router();
corsRouter.options(/.*/, corsMiddleware);
corsRouter.use(corsMiddleware);

// Interestingly, *NOT* having this line causes the tests to fail when fake timers are used.
// I don't know why. The router just fails to call "next" it seems.
corsRouter.get("/_dne", (_req, res) => {
  res.send("OK");
});
