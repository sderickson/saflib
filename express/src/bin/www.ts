#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Server Entry Point
 *
 * This file sets up and starts the HTTP server.
 * It handles:
 * - Port configuration
 * - Optional internal unix-socket listener
 * - Error handling
 * - Graceful shutdown
 */

import fs from "node:fs";
import http from "node:http";
import type { Express } from "express";
import { markInternal } from "../markInternal.ts";

/**
 * Options when starting an Express server.
 * At least one of `port` / `socketPath` is required.
 */
export interface StartServerOptions {
  /** Public TCP listener port. */
  port?: number;
  /** Internal unix-socket listener path. Requests are tagged via markInternal. */
  socketPath?: string;
}

export interface StartedExpressServer {
  /** Public TCP server, present when `port` was provided. */
  server?: http.Server;
  /** Internal unix-socket server, present when `socketPath` was provided. */
  internalServer?: http.Server;
  /** Close all started servers. */
  close: () => Promise<void>;
}

/**
 * Given an Express app and options, starts the server and sets it up for graceful shutdown.
 */
export const startExpressServer = (
  app: Express,
  options: StartServerOptions,
): StartedExpressServer => {
  if (options.port == null && options.socketPath == null) {
    throw new Error(
      "startExpressServer requires at least one of port or socketPath",
    );
  }

  let server: http.Server | undefined;
  let internalServer: http.Server | undefined;

  if (options.port != null) {
    // Get port from environment and store in Express

    const port = options.port;
    app.set("port", port);

    // Create HTTP server
    server = http.createServer(app);

    // Listen on provided port, on all network interfaces
    server.listen(port);
    server.on("error", onError);
    server.on("listening", onListening);

    /**
     * Event listener for HTTP server "error" event.
     */
    function onError(error: NodeJS.ErrnoException) {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case "EACCES":
          console.error(bind + " requires elevated privileges");
          process.exit(1);
          break;
        case "EADDRINUSE":
          console.error(bind + " is already in use");
          process.exit(1);
          break;
        default:
          throw error;
      }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */
    function onListening() {
      if (process.env.NODE_ENV === "test") {
        return;
      }
      const addr = server!.address();
      const bind =
        typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
      console.log("Express server started on " + bind);
    }
  }

  if (options.socketPath != null) {
    const socketPath = options.socketPath;

    try {
      fs.unlinkSync(socketPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    internalServer = http.createServer(markInternal(app));
    internalServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        throw error;
      }
      console.error(`Unix socket ${socketPath} listen error: ${error.code}`);
      process.exit(1);
    });
    internalServer.listen(socketPath, () => {
      fs.chmodSync(socketPath, 0o700);
      if (process.env.NODE_ENV !== "test") {
        console.log("Express internal server started on " + socketPath);
      }
    });
  }

  const servers = [server, internalServer].filter(
    (s): s is http.Server => s != null,
  );

  // Handle graceful shutdown
  // TODO: move server shutdown out of express server
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    let remaining = servers.length;
    if (remaining === 0) {
      process.exit(0);
      return;
    }
    for (const s of servers) {
      s.close(() => {
        remaining -= 1;
        if (remaining === 0) {
          console.log("HTTP server closed");
          process.exit(0);
        }
      });
    }
  });

  return {
    server,
    internalServer,
    close: () =>
      Promise.all(
        servers.map(
          (s) =>
            new Promise<void>((resolve, reject) => {
              s.close((err) => (err ? reject(err) : resolve()));
            }),
        ),
      ).then(() => undefined),
  };
};
