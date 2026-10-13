/** Keep external native URLs away from the router's malformed-UTF-8 fallback. */
export function safeNativeLink(path: string): string {
  // Training links contain route IDs, not documents or embedded attachments.
  if (path.length > 8192) return '/link-unavailable';
  try {
    // Validate encoding without rewriting delimiters, plus signs or nested URLs.
    decodeURIComponent(path);
    return path;
  } catch {
    return '/link-unavailable';
  }
}
