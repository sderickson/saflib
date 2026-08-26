/** Let `res.on("finish")` audit appends complete before listing rows in tests. */
export async function drainAuditRecorder(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}
