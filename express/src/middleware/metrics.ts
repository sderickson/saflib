import { getServiceName } from "@saflib/node";
import promBundle from "express-prom-bundle";

export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  customLabels: {
    service_name: "",
  },
  includeUp: true,
  transformLabels: (labels, req, res) => {
    labels.service_name = getServiceName();
    // For 404s stemming from random requests trying to find vulnerabilities
    if (res.statusCode === 404 && !req.openapi) {
      labels.path = "/#404";
    }
    // OPTIONS tend to pollute metrics, so group successful ones
    if (res.statusCode === 204 && req.method === "OPTIONS") {
      labels.path = "/#options";
    }
    return labels;
  },
});
