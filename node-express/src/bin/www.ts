#!/usr/bin/env node

/**
 * Server Entry Point
 *
 * This file sets up and starts the HTTP server.
 * It handles:
 * - Port configuration
 * - Error handling
 * - Graceful shutdown
 */

import http from "http";
import type { Express } from "express";

export const startServer = (app: Express) => {
  // Get port from environment and store in Express

  const port = normalizePort(process.env.PORT || "3000");
  app.set("port", port);

  // Create HTTP server
  const server = http.createServer(app);

  // Listen on provided port, on all network interfaces
  server.listen(port);
  server.on("error", onError);
  server.on("listening", onListening);

  /**
   * Normalize a port into a number, string, or false.
   */
  function normalizePort(val: string) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      // named pipe
      return val;
    }

    if (port >= 0) {
      // port number
      return port;
    }

    return false;
  }

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
    const addr = server.address();
    const bind =
      typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
    console.log("Express server started on " + bind);
  }

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
};
