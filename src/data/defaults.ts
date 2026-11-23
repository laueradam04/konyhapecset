import type { DB, DeviceKind, Frequency } from './types';

/**
 * Alapértelmezett tartományok eszköztípusonként. Kiindulópontnak szántuk:
 * a konyha saját HACCP-terve az irányadó, ezért mind átírható a beállításokban.
 */
export const KINDS: Record<DeviceKind, { label: string; min: number; max: number; checksPerDay: 1 | 2 }> = {
  'hűtő': { label: 'Hűtő', min: 0, max: 5, checksPerDay: 2 },
  'fagyasztó': { label: 'Fagyasztó', min: -30, max: -18, checksPerDay: 1 },
  'melegentartó': { label: 'Melegentartó', min: 63, max: 95, checksPerDay: 2 },
  'egyéb': { label: 'Egyéb', min: 0, max: 5, checksPerDay: 1 },
};

export const KIND_ORDER: DeviceKind[] = ['hűtő', 'fagyasztó', 'melegentartó', 'egyéb'];

export const FREQ_LABEL: Record<Frequency, string> = {
  napi: 'Naponta',
  heti: 'Hetente',
  havi: 'Havonta',
};

export const DEFAULT_TASKS: { title: string; frequency: Frequency }[] = [
  { title: 'Munkafelületek és vágódeszkák fertőtlenítése', frequency: 'napi' },
  { title: 'Padló felmosása', frequency: 'napi' },
  { title: 'Kézmosók feltöltése (szappan, fertőtlenítő, papírtörlő)', frequency: 'napi' },
  { title: 'Hulladék kivitele, kukák tisztítása', frequency: 'napi' },
  { title: 'Hűtők belső takarítása', frequency: 'heti' },
  { title: 'Elszívó zsírszűrőjének tisztítása', frequency: 'heti' },
  { title: 'Rágcsáló- és rovarcsapdák ellenőrzése', frequency: 'havi' },
];

export const DEFAULT_DEVICES: { name: string; kind: DeviceKind }[] = [
  { name: 'Hűtő 1', kind: 'hűtő' },
  { name: 'Hűtő 2', kind: 'hűtő' },
  { name: 'Fagyasztó', kind: 'fagyasztó' },
];

export const OTHER_ACTION = 'Mást tettem (leírom a megjegyzésben)';

export const ACTIONS: string[] = [
  'Hűtőt szabályoztam, 30 perc múlva újramérem',
  'Az árut áthelyeztem egy megfelelő hűtőbe',
  'Az érintett árut selejteztem',
  'Szervizt értesítettem',
  OTHER_ACTION,
];

export function emptyDB(): DB {
  return {
    version: 1,
    settings: null,
    staff: [],
    devices: [],
    tempLogs: [],
    tasks: [],
    taskDone: [],
    deliveries: [],
  };
}
