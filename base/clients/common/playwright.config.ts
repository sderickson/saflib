// Hack - load env a better way, but not dotenv, it's endless pushing dotenvx
process.env.DOMAIN = "docker.localhost";
process.env.PROTOCOL = "http";

export { default } from "@saflib/playwright/playwright.config";
