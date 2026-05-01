import {
  defineWorkflow,
  step,
  PromptStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const input = [] as const;

interface SentryInitWorkflowContext {}

export const SentryInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SentryInitWorkflowContext
>({
  id: "sentry/init",

  description:
    "Wire up Sentry for Vue source maps and Node; align CI/Docker with build secrets",

  checklistDescription: () =>
    "Apply Sentry build/runtime wiring (see workflow prompt), then complete manual setup in docs.",

  input,

  sourceUrl: import.meta.url,

  context: () => ({}),

  templateFiles: {},

  docFiles: {
    manualSetup: path.join(import.meta.dirname, "../docs/manual-setup.md"),
  },

  versionControl: {
    allowPaths: ["./docs/**"],
  },

  steps: [
    step(PromptStepMachine, ({ context }) => ({
      promptText: `Implement Sentry integration for this monorepo (adapt paths/package names to the repo). Operators should later follow **${context.docFiles?.manualSetup ?? path.join(import.meta.dirname, "../docs/manual-setup.md")}** for browser-only steps.

### Code areas (agent)

1. **GitHub Actions** — Workflow that builds Docker images must expose \`SENTRY_AUTH_TOKEN\` to the build (e.g. job \`env:\` from **repository or environment secrets**). If using a GitHub **Environment**, add \`environment:\` on the job so those secrets resolve.

2. **Client Vite build** — In the package that runs \`vite build\` for browser apps (often \`*\/clients\/build\` or similar):
   - Use **\`createSentryViteBuildPlugin\` from \`@saflib/sentry/vite-build\`** (pass \`authToken\`, Sentry \`org\`\/\`project\` slugs, \`githubRepoSlug\` for \`setCommits\`, and absolute \`monorepoRoot\`). Keep \`SENTRY_AUTH_TOKEN\` in env for the build (e.g. \`typedEnv\` or validateEnv).
   - Remove duplicate \`@sentry/vite-plugin\` from that package if the plugin is only used via \`@saflib/sentry\`.

3. **Docker (Node slim / CI)** — If \`sentry-cli\` hits TLS errors in Linux images, install **\`ca-certificates\`** in the **builder** image (e.g. \`apt-get\` in the clients build Dockerfile template).

4. **Production Docker build** — Do **not** \`COPY\` a gitignored \`.env.sentry-build-plugin\` into the image. Pass the token with **BuildKit** \`--secret id=...,env=SENTRY_AUTH_TOKEN\` and a matching \`RUN --mount=type=secret,...\` in the stage that runs \`npm run build\` for the client. The local build script should load an optional \`.env.sentry-build-plugin\` into the shell when present, and use the same \`docker build --secret\` for CI.

5. **Runtime DSNs** — Wire \`SENTRY_DSN\` (and dev/prod projects if applicable) in env schema and app init (\`@saflib/sentry\` \`initSentry\` on the server; Vue client per your SPA pattern).

6. **\`@saflib/sentry\` package** — Ensure \`./vite-build\` export and dependencies (\`@sentry/vite-plugin\`, \`@saflib/node\` for git hashes) are present; \`createSentryViteBuildPlugin\` centralizes release, \`setCommits\`, and monorepo-relative sourcemap paths.

Run \`npm install\` at the repo root after \`package.json\` changes. Fix any type or test failures in touched packages.`,
    })),

    step(CommandStepMachine, ({ context }) => {
      const doc = context.docFiles?.manualSetup ?? "";
      return {
        command: "echo",
        args: [
          `Human operator: open and follow ${doc} — Sentry projects, DSNs, auth token, GitHub secrets. No further agent steps unless something failed above.`,
        ],
      };
    }),
  ],
});

export default SentryInitWorkflowDefinition;
