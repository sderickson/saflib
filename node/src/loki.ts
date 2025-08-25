import winston from "winston";
import LokiTransport from "winston-loki";
import { addTransport } from "./logger.ts";
import { getServiceName } from "./context.ts";

/**
 * Adds a transport to the logger that sends logs to Loki. TODO: use env variables.
 */
export const addLokiTransport = () => {
  const serviceName = getServiceName();
  if (!serviceName) {
    throw new Error("Service name is not set");
  }
  addTransport(
    // TODO: use env variables
    new LokiTransport({
      host: "http://loki:3100",
      format: winston.format.json(),
      useWinstonMetaAsLabels: true,
      labels: {
        service_name: serviceName,
      },
    }),
  );
};
