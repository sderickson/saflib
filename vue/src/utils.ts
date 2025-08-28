/**
 * Utility to get the current host, including the port, e.g. "localhost:3000".
 */
export const getHost = () => {
  let host = "localhost:3000";
  if (typeof document !== "undefined") {
    host = document.location.host.split(".").slice(-2).join(".");
  }
  return host;
};

/**
 * Utility to get the current protocol the same way document.location.protocol does, e.g. "http:" or "https:".
 */
export const getProtocol = () => {
  let protocol = "http:";
  if (typeof document !== "undefined") {
    protocol = document.location.protocol;
  }
  return protocol;
};
