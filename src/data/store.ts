import { useSyncExternalStore } from 'react';
import type { DB } from './types';
import { emptyDB } from './defaults';

/*
 * Tárolás: ebben a változatban az adatok a böngészőben (localStorage) vannak.
 * A store felülete szándékosan egyszerű (get / subscribe / update), hogy később
 * Supabase-alapú, több eszköz közt szinkronizált tárolóra lehessen cserélni.
 */

const DB_KEY = 'konyhanaplo:v1';
const STAFF_KEY = 'konyhanaplo:muszakban';

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ha a böngésző nem engedi a tárolást, a munkamenet végéig memóriában marad.
  }
}

export function isValidDB(x: unknown): x is DB {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    o.version === 1 &&
    ['staff', 'devices', 'tempLogs', 'tasks', 'taskDone', 'deliveries'].every((k) => Array.isArray(o[k]))
  );
}

function load(): DB {
  const raw = safeGet(DB_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidDB(parsed)) return { ...emptyDB(), ...parsed };
    } catch {
      // sérült adat: üres naplóval indulunk
    }
  }
  return emptyDB();
}

let current: DB = typeof window === 'undefined' ? emptyDB() : load();
const listeners = new Set<() => void>();

export const store = {
  get: (): DB => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  update(fn: (db: DB) => DB): void {
    current = fn(current);
    safeSet(DB_KEY, JSON.stringify(current));
    listeners.forEach((l) => l());
  },
};

export function useDB(): DB {
  return useSyncExternalStore(store.subscribe, store.get);
}

/* --- Ki van műszakban (eszközönként megjegyezve) --- */

let currentStaff = typeof window === 'undefined' ? '' : safeGet(STAFF_KEY) ?? '';
const staffListeners = new Set<() => void>();

export function setCurrentStaff(id: string): void {
  currentStaff = id;
  safeSet(STAFF_KEY, id);
  staffListeners.forEach((l) => l());
}

export function useCurrentStaff(): string {
  return useSyncExternalStore(
    (fn) => {
      staffListeners.add(fn);
      return () => {
        staffListeners.delete(fn);
      };
    },
    () => currentStaff,
  );
}

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // nem biztonságos környezet
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
