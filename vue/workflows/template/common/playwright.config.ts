// Hack - load env a better way, but not dotenv, it's endless pushing dotenvx
process.env.DOMAIN = "__product-name__.docker.localhost";
process.env.PROTOCOL = "http";
process.env.SERVICE_SUBDOMAINS = "identity,__product-name__";

export { default } from "@saflib/playwright/playwright.config";
