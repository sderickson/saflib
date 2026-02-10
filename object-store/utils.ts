export function sanitizeFilename(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "_")
    .replace(/[<>:"/\\|?*\s]+/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 255);
}
