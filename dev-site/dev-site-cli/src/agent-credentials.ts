import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";

function writePlaceholder(outPath: string): void {
  writeFileSync(outPath, "{}\n");
  chmodSync(outPath, 0o600);
}

/** Avoid clobbering a working mount when Keychain / host lookup fails this run. */
function keepExistingCredentialsFile(
  outPath: string,
  looksValid: (raw: string) => boolean,
  reason: string,
): boolean {
  if (!existsSync(outPath)) return false;
  try {
    const raw = readFileSync(outPath, "utf8").trim();
    if (!raw || raw === "{}") return false;
    if (!looksValid(raw)) return false;
    console.error(
      `dev-site: kept existing ${path.basename(outPath)} (${reason})`,
    );
    return true;
  } catch {
    return false;
  }
}

function claudeCredentialsLookValid(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(data).length > 0;
  } catch {
    return false;
  }
}

function cursorCredentialsFileLooksValid(raw: string): boolean {
  try {
    const { access, refresh } = readTokensFromAuthFileContent(raw);
    return Boolean(access && refresh && tokensLookValid(access, refresh));
  } catch {
    return false;
  }
}

function readTokensFromAuthFileContent(raw: string): {
  access: string;
  refresh: string;
} {
  const data = JSON.parse(raw) as {
    accessToken?: string;
    refreshToken?: string;
  };
  return {
    access: data.accessToken ?? "",
    refresh: data.refreshToken ?? "",
  };
}

function securityFindGenericPassword(
  account: string,
  service: string,
): string | undefined {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-a", account, "-s", service, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch {
    return undefined;
  }
}

export function writeClaudeCredentials(devDir: string): void {
  const outPath = path.join(devDir, ".claude-credentials.json");
  const platform = os.platform();

  if (platform === "darwin") {
    const secret = securityFindGenericPassword(
      process.env.USER ?? "",
      "Claude Code-credentials",
    );
    if (secret) {
      writeFileSync(outPath, secret);
      chmodSync(outPath, 0o600);
      console.error(
        `dev-site: wrote Claude Code credentials from macOS Keychain -> ${path.basename(outPath)}`,
      );
      return;
    }
    if (
      keepExistingCredentialsFile(
        outPath,
        claudeCredentialsLookValid,
        "Keychain lookup failed; existing file still looks valid",
      )
    ) {
      return;
    }
    writePlaceholder(outPath);
    console.error(
      "dev-site: no Claude Code Keychain entry found (run 'claude login' on host, then re-run prepare) — wrote empty placeholder",
    );
    return;
  }

  if (platform === "linux") {
    const src = path.join(os.homedir(), ".claude/.credentials.json");
    if (existsSync(src)) {
      copyFileSync(src, outPath);
      chmodSync(outPath, 0o600);
      console.error(
        `dev-site: wrote Claude Code credentials from ~/.claude/.credentials.json -> ${path.basename(outPath)}`,
      );
      return;
    }
    if (
      keepExistingCredentialsFile(
        outPath,
        claudeCredentialsLookValid,
        "no ~/.claude/.credentials.json; existing copy still looks valid",
      )
    ) {
      return;
    }
    writePlaceholder(outPath);
    console.error(
      "dev-site: no ~/.claude/.credentials.json found — wrote empty placeholder",
    );
    return;
  }

  if (
    keepExistingCredentialsFile(
      outPath,
      claudeCredentialsLookValid,
      "unsupported OS; existing copy still looks valid",
    )
  ) {
    return;
  }
  writePlaceholder(outPath);
  console.error(
    "dev-site: unsupported host OS for Claude credential extraction — wrote empty placeholder",
  );
}

function jwtExp(tok: string): number | undefined {
  const parts = tok.split(".");
  if (parts.length !== 3) return undefined;
  const pad = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
  try {
    const payload = JSON.parse(
      Buffer.from(pad, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

function tokensLookValid(access: string, refresh: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  for (const tok of [refresh, access]) {
    const exp = jwtExp(tok);
    if (exp === undefined) continue;
    if (exp <= now + 60) {
      console.error(`expired token (exp=${exp}, now=${now})`);
      return false;
    }
    return true;
  }
  return true;
}

function writeCursorFromTokens(
  outPath: string,
  access: string,
  refresh: string,
): boolean {
  if (!access || !refresh) return false;
  if (!tokensLookValid(access, refresh)) return false;
  writeFileSync(
    outPath,
    `${JSON.stringify({ accessToken: access, refreshToken: refresh })}\n`,
  );
  chmodSync(outPath, 0o600);
  return true;
}

function readTokensFromAuthFile(src: string): {
  access: string;
  refresh: string;
} {
  return readTokensFromAuthFileContent(readFileSync(src, "utf8"));
}

export function writeCursorCredentials(devDir: string): void {
  const outPath = path.join(devDir, ".cursor-auth.json");
  const platform = os.platform();

  const tryAuthFile = (src: string, label: string): boolean => {
    if (!existsSync(src)) return false;
    const { access, refresh } = readTokensFromAuthFile(src);
    if (writeCursorFromTokens(outPath, access, refresh)) {
      console.error(
        `dev-site: wrote Cursor Agent credentials from ${label} -> ${path.basename(outPath)}`,
      );
      return true;
    }
    return false;
  };

  if (platform === "darwin") {
    const access = securityFindGenericPassword(
      "cursor-user",
      "cursor-access-token",
    );
    const refresh = securityFindGenericPassword(
      "cursor-user",
      "cursor-refresh-token",
    );
    if (
      access &&
      refresh &&
      writeCursorFromTokens(outPath, access, refresh)
    ) {
      console.error(
        `dev-site: wrote Cursor Agent credentials from macOS Keychain -> ${path.basename(outPath)}`,
      );
      return;
    }
    if (tryAuthFile(path.join(os.homedir(), ".cursor/auth.json"), "~/.cursor/auth.json")) {
      return;
    }
    if (
      keepExistingCredentialsFile(
        outPath,
        cursorCredentialsFileLooksValid,
        "Keychain / auth.json missing; existing copy still looks valid",
      )
    ) {
      return;
    }
    writePlaceholder(outPath);
    console.error(
      "dev-site: Cursor Agent credentials missing or expired — wrote empty placeholder",
    );
    return;
  }

  if (platform === "linux") {
    const xdg = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
    if (
      tryAuthFile(path.join(xdg, "cursor/auth.json"), "~/.config/cursor/auth.json") ||
      tryAuthFile(path.join(os.homedir(), ".cursor/auth.json"), "~/.cursor/auth.json")
    ) {
      return;
    }
    if (
      keepExistingCredentialsFile(
        outPath,
        cursorCredentialsFileLooksValid,
        "no auth.json; existing copy still looks valid",
      )
    ) {
      return;
    }
    writePlaceholder(outPath);
    console.error(
      "dev-site: Cursor Agent credentials missing or expired — wrote empty placeholder",
    );
    return;
  }

  if (
    keepExistingCredentialsFile(
      outPath,
      cursorCredentialsFileLooksValid,
      "unsupported OS; existing copy still looks valid",
    )
  ) {
    return;
  }
  writePlaceholder(outPath);
  console.error(
    "dev-site: unsupported host OS for Cursor credential extraction — wrote empty placeholder",
  );
}
