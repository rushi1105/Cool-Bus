/**
 * Timezone-safe date utilities.
 *
 * All assignment date strings must represent the operator's LOCAL day,
 * never UTC.  Using `Date.toISOString()` shifts the date backwards for
 * timezones east of UTC (e.g. IST +05:30), which causes morning-shift
 * drivers to resolve yesterday's assignment.
 *
 * These helpers use the device-local year/month/day getters so the
 * returned "YYYY-MM-DD" always matches the wall-clock date the user sees.
 */

/**
 * Returns today's date as a "YYYY-MM-DD" string in the device's local timezone.
 *
 * @example
 *   // At 04:00 IST on 2026-06-22 → "2026-06-22"
 *   // (toISOString would have returned "2026-06-21")
 *   localTodayString(); // "2026-06-22"
 */
export function localTodayString(): string {
  return localFormatDate(new Date());
}

/**
 * Formats a Date object as "YYYY-MM-DD" using the device's local timezone.
 */
export function localFormatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
