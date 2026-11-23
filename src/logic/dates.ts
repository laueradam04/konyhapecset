const pad = (n: number) => String(n).padStart(2, '0');

/** Helyi idő szerinti nap: 'ÉÉÉÉ-HH-NN' */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Helyi idő szerinti hónap: 'ÉÉÉÉ-HH' */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** A hét hétfője (helyi idő) */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const weekday = (x.getDay() + 6) % 7; // hétfő = 0
  x.setDate(x.getDate() - weekday);
  return x;
}

/** A hét azonosítója: a hétfő dayKey-e */
export function weekKey(d: Date): string {
  return dayKey(startOfWeek(d));
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function dayOfMonth(day: string): number {
  return Number(day.slice(8, 10));
}

const timeFmt = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' });
const shortFmt = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' });
const shortTimeFmt = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const longDayFmt = new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
const monthFmt = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const fullFmt = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtShortDate = (iso: string) => shortFmt.format(new Date(iso));
export const fmtShortDateTime = (iso: string) => shortTimeFmt.format(new Date(iso));
export const fmtDayLong = (d: Date) => longDayFmt.format(d);
export const fmtFullDate = (d: Date) => fullFmt.format(d);
const weekdayFmt = new Intl.DateTimeFormat('hu-HU', { weekday: 'short' });
/** '2026-11-23' → 'H' (hétfő) */
export function weekdayShort(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return weekdayFmt.format(new Date(y, m - 1, d));
}

export function fmtMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return monthFmt.format(new Date(y, m - 1, 1));
}
