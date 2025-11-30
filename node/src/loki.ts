import winston from "winston";
import LokiTransport from "winston-loki";
import { addTransport } from "./logger.ts";
import { getServiceName } from "./context.ts";
import { typedEnv } from "../env.ts";

/**
 * Adds a transport to the logger that sends logs to Loki.
 */
export const addLokiTransport = () => {
  const serviceName = getServiceName();
  if (!serviceName) {
    throw new Error("Service name is not set");
  }
  if (!typedEnv.LOKI_HOSTNAME || !typedEnv.LOKI_PORT) {
    console.warn("Loki hostname and port not provided; logs will not be sent to Loki");
    return;
  }
  addTransport(
    new LokiTransport({
      host: `http://${typedEnv.LOKI_HOSTNAME}:${typedEnv.LOKI_PORT}`,
      format: winston.format.json(),
      useWinstonMetaAsLabels: true,
      labels: {
        service_name: serviceName,
      },
    }),
  );
};
