import { ref } from "vue";
import { getHost, getProtocol } from "@saflib/links";

/**
 * Options for the download composable
 */
export interface DownloadOptions {
  /** The subdomain to download from, e.g. "api" for "api.myservice.dev" */
  subdomain: string;
  /** The API path to download from (e.g., "/foobars/download") */
  path: string;
  /** The filename for the downloaded file (e.g., "foobars.csv") */
  filename: string;
  /** Optional MIME type for the request */
  mimeType?: string;
}

/**
 * Composable for downloading files with CSRF protection
 */
export function useDownload(options: DownloadOptions) {
  const isDownloading = ref(false);
  const error = ref<string | null>(null);

  const download = async () => {
    isDownloading.value = true;
    error.value = null;

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf_token="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("CSRF token not found");
      }

      // Construct the URL
      const protocol = getProtocol();
      const host = getHost();
      const url = `${protocol}//${options.subdomain}.${host}${options.path}`;

      // Make the fetch request with CSRF header
      const response = await fetch(url, {
        method: "GET",
        credentials: "include", // Include cookies
        headers: {
          "X-CSRF-Token": csrfToken,
          Accept: options.mimeType || "application/octet-stream",
        },
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the response as blob
      const blob = await response.blob();

      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = options.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Download failed";
      error.value = errorMessage;
      throw err;
    } finally {
      isDownloading.value = false;
    }
  };

  return {
    download,
    isDownloading,
    error,
  };
}
