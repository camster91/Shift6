/** Display only: canonical recorded instants and their saved timezone stay unchanged. */
export function formatRecordedDateTime(value: string, timeZone: string, locale?: string): string {
  if (typeof value !== 'string' || !value.trim()) return 'Date unavailable';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || typeof timeZone !== 'string' || !timeZone.trim())
    return 'Date unavailable';
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return 'Date unavailable';
  }
}
