import winston from "winston";
import LokiTransport from "winston-loki";
import { addTransport } from "./logger.ts";

export const addLokiTransport = () => {
  addTransport(
    // TODO: use env variables
    new LokiTransport({
      host: "http://loki:3100",
      format: winston.format.json(),
      useWinstonMetaAsLabels: true,
    }),
  );
};
