#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Turns a freshly copied (self-contained) product into a satellite of another
 * product in the same repo, the "identity owner": the satellite uses the
 * owner's sign-in and account sites, lives under the owner's domain
 * (`<name>.<owner domain>`, `app.<name>.…`, `admin.<name>.…`, `api.<name>.…`)
 * so the Kratos session cookie reaches it, and doesn't handle Kratos courier
 * or action callbacks.
 *
 * Each edit expects the template's text and throws if it isn't there, so a
 * template change that breaks this shows up in the product/init smoke test
 * rather than as a half-converted product.
 *
 * Usage: node make-satellite.ts <repoRoot> <productName> <ownerName> [platformDeployDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface SatelliteOptions {
  repoRoot: string;
  productName: string;
  ownerName: string;
  /** The platform deploy (edge + Kratos), relative to repoRoot. Default `deploy`. */
  platformDeployDir?: string;
}

interface Owner {
  name: string;
  linksPackage: string;
  /** Production domain, e.g. `scotterickson.info`. */
  domain: string;
  /** prod-local domain, e.g. `docker.localhost`. */
  prodLocalDomain: string;
  devCompose: string;
  devNodeImage: string;
  devHasSaflibNodeModules: boolean;
}

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

function write(file: string, text: string): void {
  fs.writeFileSync(file, text);
}

/** Replaces `pattern` in `file`, throwing if it doesn't occur. */
function edit(
  file: string,
  pattern: string | RegExp,
  replacement: string,
): void {
  const text = read(file);
  const found =
    typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  if (!found) {
    throw new Error(
      `make-satellite: expected ${String(pattern)} in ${file}; has the template changed?`,
    );
  }
  write(
    file,
    typeof pattern === "string"
      ? text.split(pattern).join(replacement)
      : text.replace(pattern, replacement),
  );
}

/** Removes a top-level Caddy site block whose address line is `address {`. */
function removeSiteBlock(file: string, address: string): void {
  const lines = read(file).split("\n");
  const start = lines.indexOf(`${address} {`);
  if (start === -1) {
    throw new Error(
      `make-satellite: expected site "${address}" in ${file}; has the template changed?`,
    );
  }
  const end = lines.indexOf("}", start);
  lines.splice(start, end - start + 1 + (lines[end + 1] === "" ? 1 : 0));
  write(file, lines.join("\n"));
}

function envValue(file: string, key: string): string | undefined {
  if (!fs.existsSync(file)) return undefined;
  const line = read(file)
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}

function setEnv(file: string, key: string, value: string): void {
  edit(file, new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads what the satellite needs from the owner product. Supports owners made
 * from the template (`<owner>/deploy/remote-assets/caddy/<owner>.env`) and a
 * platform-hosted owner like home-2026's hub (`<owner>/deploy/remote-assets/env.caddy`).
 */
export function readOwner(repoRoot: string, ownerName: string): Owner {
  const ownerDir = path.join(repoRoot, ownerName);
  const linksPkg = path.join(ownerDir, "clients", "links", "package.json");
  if (!fs.existsSync(linksPkg)) {
    throw new Error(
      `make-satellite: ${ownerName} isn't a product with its own sign-in (no ${path.relative(repoRoot, linksPkg)}).`,
    );
  }
  const ownerLinks = JSON.parse(read(linksPkg)) as {
    name: string;
    saf?: { identity?: string };
  };
  if (ownerLinks.saf?.identity) {
    throw new Error(
      `make-satellite: ${ownerName} is itself a satellite of ${ownerLinks.saf.identity}; use ${ownerLinks.saf.identity} as the owner.`,
    );
  }
  const linksPackage = ownerLinks.name;
  const deploy = path.join(ownerDir, "deploy");
  const routesEnv = path.join(
    deploy,
    "remote-assets",
    "caddy",
    `${ownerName}.env`,
  );
  const routesLocalEnv = path.join(
    deploy,
    "remote-assets",
    "caddy",
    `${ownerName}.prod-local.env`,
  );
  const domain =
    envValue(routesEnv, "DOMAIN") ??
    envValue(path.join(deploy, "remote-assets", "env.caddy"), "DOMAIN");
  const prodLocalDomain =
    envValue(routesLocalEnv, "DOMAIN") ??
    envValue(path.join(deploy, "env.caddy.prod-local"), "DOMAIN");
  if (!domain || !prodLocalDomain) {
    throw new Error(
      `make-satellite: couldn't find ${ownerName}'s DOMAIN in its deploy env files.`,
    );
  }
  const devCompose = path.join(ownerDir, "dev", "docker-compose.yaml");
  const compose = read(devCompose);
  const image = /^ {2}deps:\n(?: {4}.*\n)*? {4}image: (\S+)/m.exec(compose);
  if (!image) {
    throw new Error(
      `make-satellite: couldn't find the deps service's image in ${devCompose}.`,
    );
  }
  if (!compose.includes("${SAF_DEV_SITES")) {
    throw new Error(
      `make-satellite: ${devCompose} doesn't mount satellite routes (\${SAF_DEV_SITES}) into its Caddy.`,
    );
  }
  return {
    name: ownerName,
    linksPackage,
    domain,
    prodLocalDomain,
    devCompose,
    devNodeImage: image[1]!,
    devHasSaflibNodeModules: /^ {2}saflib_node_modules:/m.test(compose),
  };
}

function removePath(productDir: string, rel: string): void {
  fs.rmSync(path.join(productDir, rel), { recursive: true, force: true });
}

function walk(dir: string, names: Set<string>, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, names, out);
    else if (names.has(entry.name)) out.push(full);
  }
  return out;
}

/** Drops dependencies on removed packages and tsconfig references to removed dirs. */
function dropReferences(
  productDir: string,
  removedPackages: Set<string>,
  removedDirs: string[],
): void {
  for (const file of walk(productDir, new Set(["package.json"]))) {
    const pkg = JSON.parse(read(file)) as Record<string, unknown>;
    let changed = false;
    for (const field of ["dependencies", "devDependencies"]) {
      const deps = pkg[field] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (removedPackages.has(name)) {
          delete deps[name];
          changed = true;
        }
      }
    }
    if (changed) write(file, JSON.stringify(pkg, null, 2) + "\n");
  }
  for (const file of walk(
    productDir,
    new Set(["tsconfig.json", "tsconfig.app.json"]),
  )) {
    const config = JSON.parse(read(file)) as {
      references?: Array<{ path: string }>;
    };
    if (!config.references) continue;
    const kept = config.references.filter(
      (ref) =>
        !removedDirs.includes(path.resolve(path.dirname(file), ref.path)),
    );
    if (kept.length !== config.references.length) {
      config.references = kept;
      write(file, JSON.stringify(config, null, 2) + "\n");
    }
  }
}

/**
 * Adds `urls` to a Kratos config's `selfservice.allowed_return_urls`, unless a
 * wildcard there already covers them. Kratos configs here list hosts one by
 * one on purpose (a subdomain wildcard is an open redirect; threat model T-9).
 */
export function allowReturnUrls(file: string, urls: string[]): boolean {
  if (!fs.existsSync(file)) return false;
  const lines = read(file).split("\n");
  const start = lines.findIndex((l) => l.trim() === "allowed_return_urls:");
  if (start === -1) return false;
  let end = start + 1;
  while (lines[end]?.trim().startsWith("- ")) end++;
  const listed = lines
    .slice(start + 1, end)
    .map((l) => l.trim().slice(2).trim());
  const covered = (url: string) =>
    listed.some((entry) => {
      if (entry === url) return true;
      const wildcard = /^(https?:\/\/)\*\.(.+)$/.exec(entry);
      return (
        !!wildcard &&
        url.startsWith(wildcard[1]!) &&
        url.endsWith(`.${wildcard[2]}`)
      );
    });
  const indent = /^(\s*)/.exec(lines[start + 1] ?? "    ")![1] || "    ";
  const missing = urls.filter((url) => !covered(url));
  if (missing.length === 0) return false;
  lines.splice(end, 0, ...missing.map((url) => `${indent}- ${url}`));
  write(file, lines.join("\n"));
  return true;
}

function satelliteRoutesEnv(
  name: string,
  protocol: string,
  domain: string,
): string {
  const host = (sub: string) => `${protocol}://${sub}.${domain}`;
  const d = escapeRegex(domain);
  const n = escapeRegex(name);
  return [
    `# Fills in {$...} in ${name}.Caddyfile. ${name} is a satellite: it sits under its`,
    `# identity owner's domain and uses the owner's sign-in and Kratos.`,
    `DOMAIN=${domain}`,
    `PROTOCOL=${protocol}`,
    `CORS_ORIGINS=^${protocol}://((app|admin)\\.)?${n}\\.${d}$`,
    `CSP_CONNECT_SRC=${host(`api.${name}`)} ${host("kratos")} https://us.i.posthog.com https://us-assets.i.posthog.com https://cloudflareinsights.com https://static.cloudflareinsights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
    `CSP_SCRIPT_SRC_EXTRA=${host("kratos")}`,
    `CSP_REPORT_URI=${host(`api.${name}`)}/csp-violations`,
    "",
  ].join("\n");
}

function satelliteDevCompose(
  options: SatelliteOptions,
  owner: Owner,
  org: string,
  rootRel: string,
): string {
  const { productName: name } = options;
  const nodeVolumes = [
    `${rootRel}:/app`,
    "node_modules:/app/node_modules",
    ...(owner.devHasSaflibNodeModules
      ? ["saflib_node_modules:/app/saflib/node_modules"]
      : []),
    "npm_cache:/root/.npm",
  ];
  const volumeLines = (extra: string[]) =>
    [...nodeVolumes, ...extra].map((v) => `      - ${v}`).join("\n");
  return `name: ${org}-${name}-dev

# ${name}'s dev stack. ${name} is a satellite of ${owner.name}: this includes ${owner.name}'s
# dev stack (Caddy on :80, Kratos, ${owner.name}'s monolith and clients) and adds
# ${name}'s own services. ${name}'s routes (sites/${name}.Caddyfile) are mounted into
# ${owner.name}'s Caddy through SAF_DEV_SITES (env.include). Run one satellite's dev
# stack at a time; they share ${owner.name}'s.
include:
  - path: ${path.relative(path.join(options.repoRoot, name, "dev"), owner.devCompose)}
    env_file: ./env.include

services:
  # The logged-out marketing site, built from clients/root.
  ${name}-static:
    image: ${org}-${name}-dev:latest
    build:
      context: ${rootRel}
      dockerfile: ./${name}/dev/Dockerfile
    command: ["caddy", "file-server", "--root", "/srv/${name}-static-root", "--listen", ":80"]

  ${name}-clients:
    image: ${owner.devNodeImage}
    depends_on:
      deps:
        condition: service_completed_successfully
    working_dir: /app/${name}/clients/build
    env_file:
      - ./env.dev
    volumes:
${volumeLines([])}
    command: npm run dev

  ${name}-monolith:
    image: ${owner.devNodeImage}
    depends_on:
      deps:
        condition: service_completed_successfully
    working_dir: /app/${name}/service/monolith
    # Same env defaults the deploy image applies (see its Dockerfile).
    entrypoint: ["sh", "/app/${name}/deploy/scripts/apply-env-defaults.sh"]
    environment:
      - SAF_ENV_DEFAULTS=/app/${name}/deploy/env.defaults
    # Restarts when any file it imports changes (service code and saflib alike).
    command:
      - node
      - --watch
      - --experimental-strip-types
      - --disable-warning=ExperimentalWarning
      - ./run.ts
    volumes:
${volumeLines([
  `${name}_db_data:/app/${name}/service/db/data`,
  `${name}_cron_data:/app/${name}/service/cron/data`,
  `${name}_jobs_data:/app/${name}/service/jobs/data`,
])}
    env_file:
      - ./env.dev
      - ./.env

volumes:
  ${name}_db_data:
    name: ${org}-${name}-dev-db-data
  ${name}_cron_data:
    name: ${org}-${name}-dev-cron-data
  ${name}_jobs_data:
    name: ${org}-${name}-dev-jobs-data
`;
}

function satelliteDevSites(name: string): string {
  return `# ${name}'s routes in its identity owner's dev Caddy (see ../docker-compose.yaml).
# Snippets come from the owner's caddy-config/common.Caddyfile.

http://${name}.docker.localhost {
	reverse_proxy ${name}-static:80 {
		import reverse_proxy_common
	}
}

http://app.${name}.docker.localhost, http://admin.${name}.docker.localhost {
	reverse_proxy ${name}-clients:5173 {
		import reverse_proxy_common
	}
}

http://api.${name}.docker.localhost {
	import cors "^http://((app|admin)\\.)?${escapeRegex(name)}\\.docker\\.localhost$"
	@public_monolith path /health /csp-violations /user-configs/unsubscribe-marketing /dev/logs /dev/logs/stream
	handle @public_monolith {
		reverse_proxy ${name}-monolith:3001 {
			import reverse_proxy_common
		}
	}
	import kratos-api-proxy ${name}-monolith:3001
}
`;
}

export function makeSatellite(options: SatelliteOptions): void {
  const { repoRoot, productName: name, ownerName } = options;
  const owner = readOwner(repoRoot, ownerName);
  const productDir = path.join(repoRoot, name);
  const at = (...parts: string[]) => path.join(productDir, ...parts);
  const linksPackage = (
    JSON.parse(read(at("clients", "links", "package.json"))) as { name: string }
  ).name;
  const scope = linksPackage.split("/")[0]!;
  const org = scope.replace(/^@/, "");
  const clientSubdomains = `${name},app.${name},admin.${name}`;

  // Sign-in, account and Kratos callbacks belong to the owner.
  const removed = [
    "clients/auth",
    "clients/account",
    "clients/build/auth",
    "clients/build/account",
    "clients/links/auth-links.ts",
    "clients/links/account-links.ts",
    "service/kratos-handlers",
    "dev/kratos",
    "dev/caddy-config",
    "dev/env.caddy",
    "dev/env.kratos.config",
  ];
  for (const rel of removed) removePath(productDir, rel);
  dropReferences(
    productDir,
    new Set([
      `${scope}/${name}-auth-spa`,
      `${scope}/${name}-account-spa`,
      `${scope}/${name}-kratos-handlers`,
    ]),
    removed.map((rel) => at(rel)),
  );

  // Subdomains move under <name>. on the owner's domain.
  fs.renameSync(at("clients/build/app"), at(`clients/build/app.${name}`));
  fs.renameSync(at("clients/build/admin"), at(`clients/build/admin.${name}`));
  for (const sub of ["app", "admin"]) {
    edit(
      at(`clients/build/${sub}.${name}/index.html`),
      `src="/${sub}/main.ts"`,
      `src="/${sub}.${name}/main.ts"`,
    );
  }
  edit(
    at("clients/build/tsconfig.app.json"),
    /"account", "admin", "app", "auth"/,
    `"admin.${name}", "app.${name}"`,
  );
  edit(
    at("clients/links/app-links.ts"),
    'const subdomain = "app";',
    `const subdomain = "app.${name}";`,
  );
  edit(
    at("clients/links/admin-links.ts"),
    'const subdomain = "admin";',
    `const subdomain = "admin.${name}";`,
  );
  edit(
    at("clients/links/root-links.ts"),
    'const subdomain = "root";',
    `const subdomain = "${name}";`,
  );
  edit(
    at("clients/links/index.ts"),
    /^export \{ authLinks \} from "\.\/auth-links\.ts";\n/m,
    "",
  );
  edit(
    at("clients/links/index.ts"),
    /^export \{ accountLinks \} from "\.\/account-links\.ts";\n/m,
    `// Sign-in and account pages are ${ownerName}'s.\nexport { accountLinks, authLinks } from "${owner.linksPackage}";\n`,
  );
  // The links package records the choice too (`saf.identity`), for later
  // workflows such as add-spa; it's what decides where sign-in links point.
  const linksPkgFile = at("clients/links/package.json");
  const linksPkg = JSON.parse(read(linksPkgFile)) as {
    saf?: Record<string, unknown>;
    dependencies: Record<string, string>;
  };
  linksPkg.saf = { ...linksPkg.saf, identity: ownerName };
  linksPkg.dependencies[owner.linksPackage] = "*";
  write(linksPkgFile, JSON.stringify(linksPkg, null, 2) + "\n");
  edit(
    at("service/sdk-common/client.ts"),
    'createSafClient<Paths>("api")',
    `createSafClient<Paths>("api.${name}")`,
  );

  // No Kratos courier or action callbacks: Kratos sends those to the owner.
  edit(
    at("service/monolith/run.ts"),
    /^import \{ startOryKratosService \} from "@saflib\/ory-kratos-http";\nimport \{\n {2}callbacks,\n {2}makeKratosActionHandler,\n\} from "[^"]+";\n/m,
    "",
  );
  edit(
    at("service/monolith/run.ts"),
    /^startOryKratosService\(\{\n {2}courierCallbacks: callbacks,\n {2}actionHandler: makeKratosActionHandler\(\),\n\}\);\n/m,
    "",
  );

  // Env: the owner's domain, with this product's subdomains.
  for (const file of [at("deploy/env.defaults"), at("dev/env.dev")]) {
    setEnv(file, "CLIENT_SUBDOMAINS", clientSubdomains);
  }
  setEnv(at("deploy/env.defaults"), "DOMAIN", owner.domain);
  setEnv(at("deploy/env.defaults"), "ADMIN_EMAILS", `admin@${owner.domain}`);
  setEnv(
    at("deploy/env.monolith.prod-local"),
    "CLIENT_SUBDOMAINS",
    clientSubdomains,
  );
  setEnv(at("deploy/env.monolith.prod-local"), "DOMAIN", owner.prodLocalDomain);
  setEnv(at("deploy/env.web.prod-local"), "DOMAIN", owner.prodLocalDomain);

  // Edge routes and the web container: only this product's own sites.
  const routes = at("deploy/remote-assets/caddy", `${name}.Caddyfile`);
  for (const sub of ["auth", "account", "kratos"]) {
    removeSiteBlock(routes, `{$PROTOCOL}://${sub}.{$DOMAIN}`);
  }
  removeSiteBlock(routes, "{$DOMAIN_REDIRECTS}");
  edit(routes, /^# Kratos public API.*\n+/m, "");
  edit(
    routes,
    "{$PROTOCOL}://{$DOMAIN} {",
    `{$PROTOCOL}://${name}.{$DOMAIN} {`,
  );
  for (const sub of ["app", "admin", "api"]) {
    edit(
      routes,
      `{$PROTOCOL}://${sub}.{$DOMAIN} {`,
      `{$PROTOCOL}://${sub}.${name}.{$DOMAIN} {`,
    );
  }
  const protocolOf = (domain: string) =>
    domain.endsWith("localhost") ? "http" : "https";
  write(
    at("deploy/remote-assets/caddy", `${name}.env`),
    satelliteRoutesEnv(name, protocolOf(owner.domain), owner.domain),
  );
  write(
    at("deploy/remote-assets/caddy", `${name}.prod-local.env`),
    satelliteRoutesEnv(name, "http", owner.prodLocalDomain),
  );
  const web = at("deploy/builds/web/Caddyfile");
  removeSiteBlock(web, "http://auth.{$DOMAIN}");
  removeSiteBlock(web, "http://account.{$DOMAIN}");
  edit(web, "http://{$DOMAIN} {", `http://${name}.{$DOMAIN} {`);
  for (const sub of ["app", "admin"]) {
    edit(web, `http://${sub}.{$DOMAIN} {`, `http://${sub}.${name}.{$DOMAIN} {`);
    edit(web, `/${sub}/index.html`, `/${sub}.${name}/index.html`);
  }

  // Kratos must accept this product's hosts as return URLs.
  const hosts = (protocol: string, domain: string) =>
    [name, `app.${name}`, `admin.${name}`].map(
      (sub) => `${protocol}://${sub}.${domain}/`,
    );
  const platform = path.join(repoRoot, options.platformDeployDir ?? "deploy");
  for (const file of [
    path.join(platform, "kratos", "kratos.yml"),
    path.join(platform, "remote-assets", "kratos", "kratos.yml"),
  ]) {
    allowReturnUrls(file, hosts(protocolOf(owner.domain), owner.domain));
  }
  allowReturnUrls(
    path.join(platform, "kratos-prod-local", "kratos.yml"),
    hosts("http", owner.prodLocalDomain),
  );
  allowReturnUrls(
    path.join(repoRoot, ownerName, "dev", "kratos", "kratos.yml"),
    hosts("http", "docker.localhost"),
  );

  // Dev: the owner's stack plus this product's services.
  const rootRel = path.relative(at("dev"), repoRoot) || ".";
  write(
    at("dev/docker-compose.yaml"),
    satelliteDevCompose(options, owner, org, rootRel),
  );
  fs.mkdirSync(at("dev/sites"), { recursive: true });
  write(at("dev/sites", `${name}.Caddyfile`), satelliteDevSites(name));
  write(
    at("dev/env.include"),
    `# Interpolation for ${ownerName}'s included dev compose: mount ${name}'s routes into its Caddy.\nSAF_DEV_SITES=${path.relative(path.dirname(owner.devCompose), at("dev/sites"))}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repoRoot, productName, ownerName, platformDeployDir] =
    process.argv.slice(2);
  if (!repoRoot || !productName || !ownerName) {
    console.error(
      "Usage: make-satellite.ts <repoRoot> <productName> <ownerName>",
    );
    process.exit(1);
  }
  makeSatellite({
    repoRoot: path.resolve(repoRoot),
    productName,
    ownerName,
    platformDeployDir,
  });
}
