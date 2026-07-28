/**
 * Turn a raw User-Agent into a short human-readable label for login history.
 * Examples:
 *   Chrome/150 … Windows NT 10.0 → "Chrome · Windows"
 *   WindowsPowerShell/5.1 …     → "PowerShell · Windows"
 */
export function summarizeUserAgent(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'Unknown device';

  // Already humanized (e.g. "Chrome · Windows")
  if (ua.includes(' · ') && ua.length < 40) return ua;

  if (/^device:/i.test(ua)) {
    return 'App / API client';
  }

  const browser =
    /Edg\//i.test(ua)
      ? 'Edge'
      : /OPR\/|Opera/i.test(ua)
        ? 'Opera'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Chrome\//i.test(ua) && !/Chromium/i.test(ua)
            ? 'Chrome'
            : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
              ? 'Safari'
              : /WindowsPowerShell|PowerShell/i.test(ua)
                ? 'PowerShell'
                : /curl\//i.test(ua)
                  ? 'curl'
                  : /Postman/i.test(ua)
                    ? 'Postman'
                    : /node/i.test(ua)
                      ? 'Node'
                      : null;

  const os =
    /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Windows NT|WindowsPowerShell|Windows/i.test(ua)
            ? 'Windows'
            : /Linux/i.test(ua)
              ? 'Linux'
              : null;

  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;
  return 'Other device';
}
