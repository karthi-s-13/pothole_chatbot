function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Fetches a same-origin/public asset and wraps it as a File, so it can be sent through the
 * same upload path as a user-picked file (used for "try a sample image"). */
export async function fetchAsFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load sample image (${response.status}).`);
  }
  const blob = await response.blob();
  const mimeType =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : inferMimeType(filename);
  return new File([blob], filename, { type: mimeType });
}
