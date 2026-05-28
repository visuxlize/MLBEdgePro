/**
 * Returns the current LOCAL calendar date as "YYYY-MM-DD".
 * Unlike toISOString() which uses UTC, this respects the device's timezone,
 * so 11 PM on May 27 stays May 27 — not May 28 in UTC.
 */
export function localDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatGameDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString();
}

export function formatStat(value: number, digits = 2): string {
  return value.toFixed(digits);
}
