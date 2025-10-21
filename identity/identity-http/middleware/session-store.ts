import session from "express-session";
import sqlite from "better-sqlite3";
// @ts-ignore
import BetterSqlite3SessionStore from "better-sqlite3-session-store";
import path from "path";
const SqliteStore = BetterSqlite3SessionStore(session);
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { typedEnv } from "../env.ts";

const secretFile = path.join(__dirname, `../data/session-secret.txt`);

// used both for how often to rotate secrets, and how long until a cookie expires
const sessionRotationInterval = 14 * 24 * 60 * 60 * 1000; // 14 days
let currentSecretStorage: SessionSecretStorage | undefined;

export const clearStorage = () => {
  currentSecretStorage = undefined;
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
};

interface SessionSecretStorage {
  secrets: string[]; // list of secrets per express-session. First one is the active one.
  lastUpdated: number; // timestamp of the last update
}

const generateSecret = () => randomBytes(32).toString("hex");

const createNewStorage = (): SessionSecretStorage => {
  return {
    secrets: [generateSecret()],
    lastUpdated: Date.now(),
  };
};

const rotateSecret = () => {
  if (!currentSecretStorage) {
    throw new Error("No secret storage found");
  }
  const newSecret = generateSecret();
  currentSecretStorage.secrets.unshift(newSecret);
  while (currentSecretStorage.secrets.length > 2) {
    currentSecretStorage.secrets.pop();
  }
  currentSecretStorage.lastUpdated = Date.now();
};

const rotateIfNeeded = () => {
  if (!currentSecretStorage) {
    throw new Error("No secret storage found");
  }
  if (currentSecretStorage.lastUpdated < Date.now() - sessionRotationInterval) {
    rotateSecret();
    writeFileSync(secretFile, JSON.stringify(currentSecretStorage));
  }
};

let interval: NodeJS.Timeout | undefined;

// Rather than manually managing a session secret, the service will automatically
// generate and rotate secrets.
const upsertSessionSecret = () => {
  if (!existsSync(secretFile)) {
    currentSecretStorage = createNewStorage();
    writeFileSync(secretFile, JSON.stringify(currentSecretStorage));
  } else {
    const contents = readFileSync(secretFile, "utf8");
    currentSecretStorage = JSON.parse(contents) as SessionSecretStorage;
    rotateIfNeeded();
  }
  return currentSecretStorage.secrets;
};

export const makeSessionMiddleware = () => {
  if (!interval) {
    interval = setInterval(rotateIfNeeded, 1000 * 60 * 60); // check every hour
  }

  const sessionDbName = `sessions-${typedEnv.DEPLOYMENT_NAME}.sqlite`;

  const sessionDb = new sqlite(
    path.join(__dirname, `../data/${sessionDbName}`),
  );
  const sessionStore = new SqliteStore({
    client: sessionDb,
    expired: {
      clear: true,
      intervalMs: 900000, //ms = 15min
    },
  });

  const cookie = {
    secure: typedEnv.PROTOCOL === "https",
    maxAge: sessionRotationInterval,
    sameSite: "strict" as const,
    domain: `.${typedEnv.DOMAIN}`, // Allow cookies to be shared across subdomains
    httpOnly: true,
  };

  const sessionOptions = {
    store: typedEnv.NODE_ENV === "test" ? undefined : sessionStore,
    secret: upsertSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: typedEnv.NODE_ENV === "test" ? undefined : cookie,
  };

  return session(sessionOptions);
};
