import promBundle from "express-prom-bundle";

export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  transformLabels: (labels, req, res) => {
    // For 404s
    if (res.statusCode === 404 && !req.openapi) {
      // apparently you don't return a new labels object... interesting
      labels.path = "/global-404";
      return labels;
    }
    return labels;
  },
});
