import { describe, expect, it } from "vitest";
import { resourceProblems, serviceProblems } from "./preflight.ts";

const MARK = "---saf-preflight---";
const GiB = 1024 ** 3;

describe("resourceProblems", () => {
  it("flags limits bigger than the host", () => {
    const config = {
      services: {
        edge: {
          deploy: {
            resources: { limits: { cpus: 2, memory: String(512 * 1024 ** 2) } },
          },
        },
        db: {
          deploy: {
            resources: { limits: { cpus: 0.5, memory: String(8 * GiB) } },
          },
        },
        quiet: {},
      },
    };
    expect(
      resourceProblems(`${JSON.stringify(config)}\n${MARK}\n1\n${4 * GiB}\n`),
    ).toEqual([
      "edge limits CPUs to 2, but the host has 1",
      "db limits memory to 8192 MiB, but the host has 4096 MiB",
    ]);
  });

  it("says nothing it can't check", () => {
    expect(resourceProblems("")).toEqual([]);
  });
});

describe("serviceProblems", () => {
  it("flags missing, restarting and failed services; one-shot successes are fine", () => {
    const ps = [
      { Service: "edge", State: "running" },
      { Service: "migrate", State: "exited", ExitCode: 0 },
      { Service: "worker", State: "restarting", ExitCode: 1 },
      { Service: "job", State: "exited", ExitCode: 2 },
    ]
      .map((s) => JSON.stringify(s))
      .join("\n");
    const output = `edge\nmigrate\nworker\njob\nproxy\n${MARK}\n${ps}\n`;
    expect(serviceProblems(output)).toEqual([
      "worker is restarting (exit 1)",
      "job is exited (exit 2)",
      "proxy has no container",
    ]);
  });

  it("reads the older array output", () => {
    const output = `edge\n${MARK}\n${JSON.stringify([{ Service: "edge", State: "running" }])}`;
    expect(serviceProblems(output)).toEqual([]);
  });
});
