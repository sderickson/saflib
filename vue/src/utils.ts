// works in vitest or browser
export const getHost = () => {
  let host = "localhost:3000";
  if (typeof document !== "undefined") {
    host = document.location.host.split(".").slice(-2).join(".");
  }
  return host;
};

export const getProtocol = () => {
  let protocol = "http:";
  if (typeof document !== "undefined") {
    protocol = document.location.protocol;
  }
  return protocol;
};
