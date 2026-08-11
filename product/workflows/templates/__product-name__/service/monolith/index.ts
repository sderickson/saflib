import { startExpressServer } from "@saflib/express";
import { create__ServiceName__HttpApp } from "template-package-http/http";
import { __serviceName__Db } from "template-package-db/instances";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "template-package-service-common/context";

export function start__ServiceName__Service() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up __service-name__ service...");
    log.info("Connecting to __service-name__-db...");
    const dbKey = __serviceName__Db.connect({ onDisk: true });
    const context = makeContext({ __serviceName__DbKey: dbKey });
    log.info("__service-name__-db connection complete.");

    log.info("Starting __service-name__-http...");
    const expressApp = create__ServiceName__HttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(
        typedEnv.__SERVICE_NAME___SERVICE_HTTP_HOST.split(":")[1] || "3000",
        10,
      ),
    });
    log.info("__service-name__-http startup complete.");
    logClientAccessUrls(log);
  } catch (error) {
    logError(error);
  }
}

/** Print SPA URLs from CLIENT_SUBDOMAINS for local/prod-local quick access. */
function logClientAccessUrls(log: { info: (msg: string) => void }) {
  const { PROTOCOL: protocol, DOMAIN: domain, CLIENT_SUBDOMAINS } = typedEnv;
  const skip = new Set(["grafana"]);
  const urls = CLIENT_SUBDOMAINS.split(",")
    .map((s) => s.trim())
    .filter((s) => !skip.has(s))
    .map((sub) =>
      sub === "" ? `${protocol}://${domain}/` : `${protocol}://${sub}.${domain}/`,
    );
  if (urls.length === 0) return;
  log.info("Ready — open a SPA:");
  for (const url of urls) {
    log.info(`  ${url}`);
  }
}
