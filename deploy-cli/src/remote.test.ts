import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadDeployConfig, parseEnvFile, requireRemote } from "./config.ts";
import {
  localPayload,
  readRemoteScript,
  remotePayload,
  upScript,
} from "./remote.ts";

/** Runs a payload the way the server would (`bash -s`), locally. */
function runLocally(payload: string, env: Record<string, string> = {}): string {
  return execFileSync("bash", ["-s"], {
    input: payload,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("config", () => {
  let dir: string;
  const previous = process.env.CONTAINER_REGISTRY;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "saflib-deploy-config-"));
    delete process.env.CONTAINER_REGISTRY;
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.CONTAINER_REGISTRY;
    else process.env.CONTAINER_REGISTRY = previous;
  });

  it("parses env.remote, skipping comments and stripping quotes", () => {
    expect(
      parseEnvFile(
        "# comment\nSSH_HOSTNAME=root@example.com\nexport A=\"quoted value\"\nB='x'\n\nnot a var\n",
      ),
    ).toEqual({ SSH_HOSTNAME: "root@example.com", A: "quoted value", B: "x" });
  });

  it("lets CONTAINER_REGISTRY from the environment win (CI)", () => {
    writeFileSync(
      path.join(dir, "env.remote"),
      "CONTAINER_REGISTRY=ghcr.io/me\n",
    );
    expect(loadDeployConfig(dir).containerRegistry).toBe("ghcr.io/me");
    process.env.CONTAINER_REGISTRY = "ghcr.io/ci";
    const config = loadDeployConfig(dir);
    expect(config.containerRegistry).toBe("ghcr.io/ci");
    expect(config.env.CONTAINER_REGISTRY).toBe("ghcr.io/ci");
  });

  it("names missing remote settings", () => {
    writeFileSync(path.join(dir, "env.remote"), "SSH_HOSTNAME=h\n");
    expect(() => requireRemote(loadDeployConfig(dir))).toThrow(
      /missing REMOTE_ZIP_PATH, REMOTE_ASSETS_FOLDER_PATH/,
    );
  });
});

describe("remotePayload", () => {
  const config = (env: Record<string, string>) => ({
    deployDir: "/x",
    env,
    composeFile: "/x/remote-assets/docker-compose.prod.yaml",
    composeFiles: ["/x/remote-assets/docker-compose.prod.yaml"],
  });

  it("starts with sudo -i unless REMOTE_SUDO=0", () => {
    expect(remotePayload(config({}), "true").startsWith("sudo -i\n")).toBe(
      true,
    );
    expect(remotePayload(config({ REMOTE_SUDO: "0" }), "true")).not.toContain(
      "sudo -i",
    );
  });

  it("exports env.remote values safely quoted", () => {
    const out = runLocally(
      remotePayload(
        config({ REMOTE_SUDO: "0", TRICKY: "it's $HOME `x`" }),
        'echo "$TRICKY"; bash -c \'echo "child:$TRICKY"\'',
      ),
    );
    expect(out).toBe("it's $HOME `x`\nchild:it's $HOME `x`\n");
  });

  it("stops at the first failing command", () => {
    expect(() =>
      runLocally(
        remotePayload(config({ REMOTE_SUDO: "0" }), "false\necho after"),
      ),
    ).toThrow();
  });
});

describe("remote scripts", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "saflib-deploy-scripts-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("pull pulls only the product's registry images", () => {
    const bin = path.join(dir, "bin");
    mkdirSync(bin);
    // Fake docker: `compose … config --images` lists images; `pull` logs.
    writeFileSync(
      path.join(bin, "docker"),
      `#!/bin/bash
if [ "$1" = compose ]; then printf 'reg.io/me/acme-caddy:latest\\noryd/kratos:v26\\nreg.io/me/acme-monolith:latest\\n'; fi
if [ "$1" = pull ]; then echo "PULLED $2" >> "${dir}/pulls"; fi
`,
    );
    chmodSync(path.join(bin, "docker"), 0o755);
    writeFileSync(
      path.join(bin, "sudo"),
      `#!/bin/bash
while [[ "$1" == *=* ]]; do export "$1"; shift; done
exec "$@"
`,
    );
    chmodSync(path.join(bin, "sudo"), 0o755);
    runLocally(
      remotePayload(
        {
          deployDir: "/x",
          env: {
            REMOTE_SUDO: "0",
            CONTAINER_REGISTRY: "reg.io/me",
            REMOTE_ASSETS_FOLDER_PATH: dir,
          },
          composeFile: "",
          composeFiles: [],
        },
        readRemoteScript("pull"),
      ),
      { PATH: `${bin}:${process.env.PATH}` },
    );
    expect(readFileSync(path.join(dir, "pulls"), "utf8")).toBe(
      "PULLED reg.io/me/acme-caddy:latest\nPULLED reg.io/me/acme-monolith:latest\n",
    );
  });

  it("extract-assets replaces the assets folder contents from the uploaded zip", () => {
    const assets = path.join(dir, "assets");
    const upload = path.join(dir, "upload");
    mkdirSync(path.join(assets, "kratos"), { recursive: true });
    writeFileSync(path.join(assets, "stale.txt"), "old");
    mkdirSync(path.join(upload, "src", "kratos"), { recursive: true });
    writeFileSync(
      path.join(upload, "src", "docker-compose.prod.yaml"),
      "services: {}\n",
    );
    writeFileSync(path.join(upload, "src", "kratos", "kratos.yml"), "k: v\n");
    execFileSync("zip", ["-qr", path.join(upload, "a.zip"), "."], {
      cwd: path.join(upload, "src"),
    });

    runLocally(
      remotePayload(
        {
          deployDir: "/x",
          env: {
            REMOTE_SUDO: "0",
            REMOTE_ZIP_PATH: upload,
            REMOTE_ASSETS_FOLDER_PATH: assets,
          },
          composeFile: "",
          composeFiles: [],
        },
        readRemoteScript("extract-assets"),
        { ZIP_NAME: "a.zip" },
      ),
    );
    expect(
      readFileSync(path.join(assets, "kratos", "kratos.yml"), "utf8"),
    ).toBe("k: v\n");
    expect(existsSync(path.join(assets, "docker-compose.prod.yaml"))).toBe(
      true,
    );
    expect(existsSync(path.join(assets, "stale.txt"))).toBe(false);
    expect(existsSync(path.join(upload, "a.zip"))).toBe(false);
  });

  describe("register-sites", () => {
    let sites: string;
    let deployDir: string;
    let bin: string;

    /**
     * Fake docker standing in for the edge container: its /etc/caddy/sites is
     * a local dir, and `caddy reload` fails if any route contains "bogus".
     */
    beforeEach(() => {
      sites = path.join(dir, "sites");
      deployDir = path.join(dir, "deploy");
      bin = path.join(dir, "bin");
      mkdirSync(sites);
      mkdirSync(path.join(deployDir, "remote-assets", "caddy"), {
        recursive: true,
      });
      mkdirSync(bin);
      writeFileSync(
        path.join(bin, "docker"),
        `#!/bin/bash
SITES="${sites}"
case "$1" in
  inspect) exit 0 ;;
  compose) echo acme-web ;;
  ps) [ -f "$SITES/../running-\${4##*-}" ] && echo container-id ;;
  cp) cp "$2" "$SITES/\${3##*/}" ;;
  exec)
    shift 2
    if [ "$1" = caddy ]; then ! grep -q bogus "$SITES"/*.Caddyfile; exit $?; fi
    args=(); for a in "$@"; do args+=("$(printf %s "$a" | sed "s#/etc/caddy/sites#$SITES#g")"); done
    "\${args[@]}" ;;
esac
`,
      );
      chmodSync(path.join(bin, "docker"), 0o755);
    });

    const register = () =>
      runLocally(
        localPayload(
          {
            deployDir,
            env: { SAF_EDGE_CONTAINER: "edge" },
            composeFile: "",
            composeFiles: [],
          },
          readRemoteScript("register-sites"),
        ),
        { PATH: `${bin}:${process.env.PATH}` },
      );
    const route = (content: string) =>
      writeFileSync(
        path.join(deployDir, "remote-assets", "caddy", "acme.Caddyfile"),
        content,
      );

    it("copies the deploy's routes into the edge", () => {
      route("good\n");
      register();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "good\n",
      );
      expect(existsSync(path.join(sites, "acme.Caddyfile.bak"))).toBe(false);
    });

    it("restores the previous routes when the edge rejects the new ones", () => {
      route("good\n");
      register();
      route("bogus\n");
      expect(register).toThrow();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "good\n",
      );
    });

    it("fills in placeholders from the route's env, preferring prod-local locally", () => {
      route("{$DOMAIN} {$CORS} {$EDGE_ONLY}\n");
      const caddy = path.join(deployDir, "remote-assets", "caddy");
      writeFileSync(
        path.join(caddy, "acme.env"),
        '# comment\nDOMAIN=acme.com\nCORS="^https://(a|b)\\.acme\\.com$"\n',
      );
      writeFileSync(
        path.join(caddy, "acme.prod-local.env"),
        "DOMAIN=acme.localhost\n",
      );
      register();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "acme.localhost {$CORS} {$EDGE_ONLY}\n",
      );
      rmSync(path.join(caddy, "acme.prod-local.env"));
      register();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "acme.com ^https://(a|b)\\.acme\\.com$ {$EDGE_ONLY}\n",
      );
    });

    it("names the live blue-green color in routes", () => {
      route("reverse_proxy acme-web-{$SAF_COLOR}:80\n");
      writeFileSync(
        path.join(deployDir, "remote-assets", "docker-compose.blue-green.yaml"),
        "services: {}\n",
      );
      const state = path.join(deployDir, ".saf-deploy", "remote-assets");
      mkdirSync(state, { recursive: true });
      writeFileSync(path.join(state, "live"), "green\n");
      // The recorded color, when its containers run…
      writeFileSync(path.join(dir, "running-green$"), "");
      register();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "reverse_proxy acme-web-green:80\n",
      );
      // …else whichever color's containers do.
      rmSync(path.join(dir, "running-green$"));
      writeFileSync(path.join(dir, "running-blue$"), "");
      register();
      expect(readFileSync(path.join(sites, "acme.Caddyfile"), "utf8")).toBe(
        "reverse_proxy acme-web-blue:80\n",
      );
    });

    it("removes a first-time route the edge rejects", () => {
      route("bogus\n");
      expect(register).toThrow();
      expect(existsSync(path.join(sites, "acme.Caddyfile"))).toBe(false);
    });
  });

  it("up registers edge routes after bringing the stack up", () => {
    const script = upScript();
    expect(
      script.indexOf("compose -f docker-compose.prod.yaml up"),
    ).toBeLessThan(script.indexOf('register_sites "$new"'));
  });

  it("every bundled script parses", () => {
    for (const name of [
      "setup",
      "pull",
      "up",
      "down",
      "logs",
      "purge",
      "extract-assets",
      "register-sites",
      "live",
      "sites",
    ] as const) {
      execFileSync("bash", ["-n"], { input: readRemoteScript(name) });
    }
  });
});
