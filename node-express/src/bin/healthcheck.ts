import http from "http";

export const healthcheck = () => {
  const port = process.env.PORT || 3000;
  const options = {
    host: "localhost",
    port,
    path: "/health",
    timeout: 2000,
  };

  const request = http.get(options, (res) => {
    console.log(`Health check status: ${res.statusCode}`);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });

  request.on("error", (err) => {
    console.error("Health check failed:", err.message);
    process.exit(1);
  });

  request.on("timeout", () => {
    console.error("Health check timeout");
    process.exit(1);
  });
};
