import { randomUUID } from "crypto";
import { getBlobServiceClient } from "./client.ts";
import { getSafReporters } from "@saflib/node";

export async function testAzureBlobStorage() {
  const { log, logError } = getSafReporters();

  while (true) {
    try {
      log.info("Azure Blob Storage - Running JavaScript quickstart sample");
      const blobServiceClient = getBlobServiceClient();

      const containerName = "quickstart" + randomUUID();

      log.info("Creating container...", containerName);

      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const createContainerResponse = await containerClient.create();
      log.info(
        `Container was created successfully. requestId:${createContainerResponse.requestId} URL: ${containerClient.url}`,
      );
      break;
    } catch (err: unknown) {
      logError(err);
      log.info("Sleeping for 10 seconds... zzz");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
