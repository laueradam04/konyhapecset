import type { Device } from '../data/types';

export function inRange(value: number, d: Pick<Device, 'min' | 'max'>): boolean {
  return value >= d.min && value <= d.max;
}

const nf1 = new Intl.NumberFormat('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });
const typoMinus = (s: string) => s.replace('-', '−');

/** 3.5 → „3,5 °C”, -18 → „−18,0 °C” */
export function fmtTemp(v: number): string {
  return `${typoMinus(nf1.format(v))} °C`;
}

/** Mértékegység nélkül, egy tizedessel: -18 → „−18,0” */
export function fmtVal(v: number): string {
  return typoMinus(nf1.format(v));
}

/** Határértékekhez: -18 → „−18”, 4.5 → „4,5” */
export function fmtNum(v: number): string {
  return typoMinus(nf0.format(v));
}

export function fmtRange(d: Pick<Device, 'min' | 'max'>): string {
  return `${fmtNum(d.min)} és ${fmtNum(d.max)} °C között`;
}

/** Szerkeszthető mezőbe: -18 → „-18”, 4.5 → „4,5” */
export function toInput(v: number): string {
  return String(v).replace('.', ',');
}

/**
 * Hőmérő-leolvasás értelmezése. Elfogad vesszőt és pontot, legfeljebb 3 egész
 * és 1 tizedes jegyet, valamint a félbehagyott „3,” alakot.
 */
export function parseReading(input: string): number | null {
  const t = input.trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  if (!/^-?\d{1,3}(\.\d?)?$/.test(t)) return null;
  const n = Number(t.endsWith('.') ? t.slice(0, -1) : t);
  return Number.isFinite(n) ? n : null;
}

/** A mérőképernyő billentyűzetének logikája. */
export function applyKey(cur: string, key: string): string {
  if (key === 'del') return cur.slice(0, -1);
  if (key === '±') return cur.startsWith('-') ? cur.slice(1) : `-${cur}`;

  const neg = cur.startsWith('-');
  const sign = neg ? '-' : '';
  const body = neg ? cur.slice(1) : cur;
  const [intPart, decPart] = body.split(',');

  if (key === ',') {
    if (decPart !== undefined) return cur;
    return `${sign}${intPart === '' ? '0' : intPart},`;
  }

  if (/^\d$/.test(key)) {
    if (decPart !== undefined) return decPart.length >= 1 ? cur : cur + key;
    if (intPart === '0') return sign + key;
    if (intPart.length >= 3) return cur;
    return cur + key;
  }

  return cur;
}
