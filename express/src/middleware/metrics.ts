import promBundle from "express-prom-bundle";

export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  transformLabels: (labels, req, res) => {
    // For 404s stemming from random requests trying to find vulnerabilities
    if (res.statusCode === 404 && !req.openapi) {
      // apparently you don't return a new labels object... interesting
      labels.path = "/#404";
    }
    if (res.statusCode === 200 && req.method === "OPTIONS") {
      labels.path = "/#options";
    }
    return labels;
  },
});
