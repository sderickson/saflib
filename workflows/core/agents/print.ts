let printerInterval: NodeJS.Timeout | undefined;
let counter = 0;
const MAX_INTERVAL_MS = 100; // The maximum interval between prints
const MIN_INTERVAL_MS = 10; // The minimum interval between prints
const ACCELERATION_FACTOR = 8; // The higher the value, the faster the printing accelerates

import { print } from "../utils.ts";

export const shortTimestamp = () => {
  return new Date().toISOString().split("T")[1].slice(0, 5);
};

/**
 * Appends text to a buffer and, if there isn't one already, sets up an interval to print the buffer
 * gradually. It prints each line betwe
 */
export const printLineSlowly = (line: string) => {
  printerBuffer.push(...line.split("\n"));
  if (!printerInterval) {
    printerInterval = setInterval(() => {
      counter++;
      const mod = Math.max(
        MAX_INTERVAL_MS - printerBuffer.length * ACCELERATION_FACTOR,
        MIN_INTERVAL_MS,
      );
      if (counter < mod) {
        return;
      }

      const line = printerBuffer.shift();
      if (line !== undefined) {
        // Reset the counter, so
        print(line);
        counter = 0;
      }
      if (printerBuffer.length === 0) {
        clearInterval(printerInterval);
        printerInterval = undefined;
      }
    }, 1);
  }
};

const printerBuffer: string[] = [];
