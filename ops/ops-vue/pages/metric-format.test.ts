import { describe, expect, it } from "vitest";
import { formatBytes, formatMetricValue } from "./metric-format.ts";

describe("metric-format", () => {
  it("formats bytes in binary units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(301_989_888)).toBe("288 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3 GB");
  });

  it("uses bytes only for *_bytes metrics, and passes +Inf through", () => {
    expect(formatMetricValue("process_resident_memory_bytes", 301_989_888)).toBe("288 MB");
    expect(formatMetricValue("jobs_total", 1500)).toBe("1,500");
    expect(formatMetricValue("payload_size_bytes", "+Inf")).toBe("+Inf");
    expect(formatMetricValue("payload_size_bytes", "4096")).toBe("4 KB");
    expect(formatMetricValue("x_bytes", null)).toBe("—");
  });
});
