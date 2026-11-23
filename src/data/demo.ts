import type { DB, Delivery, Device, Staff, Task, TaskDone, TempLog } from './types';
import { ACTIONS, DEFAULT_TASKS } from './defaults';
import { inRange } from '../logic/temp';

/** Determinisztikus álvéletlen-generátor (mulberry32), hogy a demó mindig ugyanúgy nézzen ki. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

const DELIVERIES: { supplier: string; product: string; temp: [number, number] | null }[] = [
  { supplier: 'Hús-Pont Kft.', product: 'Sertéskaraj, 12 kg', temp: [2, 4] },
  { supplier: 'Zöldségkert Bt.', product: 'Vegyes zöldség, 20 kg', temp: null },
  { supplier: 'Tej-Farm Zrt.', product: 'Tejföl, tej, trappista', temp: [3, 5] },
  { supplier: 'Hús-Pont Kft.', product: 'Csirkemell, 10 kg', temp: [1, 3.5] },
  { supplier: 'Sarki pékség', product: 'Zsemle, kenyér', temp: null },
  { supplier: 'Fagyasztott Áru Kft.', product: 'Hasábburgonya, 25 kg', temp: [-20, -18.5] },
];

/**
 * Két hétnyi kitalált napló egy kis bisztróhoz. Tartalmaz egy hűtő-eltérést
 * beavatkozással, egy kimaradt mérési napot, egy kihagyott takarítást és egy
 * visszautasított áruátvételt, hogy a bemutatón minden funkció látszódjon.
 */
export function seedDemo(now: Date): DB {
  const r = rng(20261123);
  const DAYS = 14;
  const at = (daysAgo: number, h: number, m: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, 0);
  const created = at(DAYS - 1, 6, 0).toISOString();

  const staff: Staff[] = ['Kata', 'Bence', 'Zoli'].map((name, i) => ({ id: `s${i + 1}`, name, active: true }));
  const devices: Device[] = [
    { id: 'd1', name: 'Hűtő 1 – hús, hal', kind: 'hűtő', min: 0, max: 4, checksPerDay: 2, active: true, createdAt: created },
    { id: 'd2', name: 'Hűtő 2 – tejtermék, zöldség', kind: 'hűtő', min: 0, max: 5, checksPerDay: 2, active: true, createdAt: created },
    { id: 'd3', name: 'Mélyhűtő', kind: 'fagyasztó', min: -30, max: -18, checksPerDay: 1, active: true, createdAt: created },
    { id: 'd4', name: 'Melegentartó pult', kind: 'melegentartó', min: 63, max: 95, checksPerDay: 2, active: true, createdAt: created },
  ];
  const tasks: Task[] = DEFAULT_TASKS.map((t, i) => ({ id: `t${i + 1}`, title: t.title, frequency: t.frequency, active: true }));

  const tempLogs: TempLog[] = [];
  const taskDone: TaskDone[] = [];
  const deliveries: Delivery[] = [];
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const who = () => staff[Math.floor(r() * staff.length)].id;
  let deliveryIndex = 0;

  for (let ago = DAYS - 1; ago >= 0; ago--) {
    // Hőmérséklet-mérések
    for (const d of devices) {
      const slots: [number, number][] = d.checksPerDay === 2 ? [[7, 20], [14, 40]] : [[7, 25]];
      for (const [h, m] of slots) {
        const t = at(ago, h, m + Math.floor(r() * 15));
        if (t > now) continue;
        if (ago === 9 && d.id === 'd2') continue; // kimaradt nap
        if (ago === 5 && d.id === 'd1' && h === 7) {
          tempLogs.push({
            id: id('l'), deviceId: d.id, value: 7.2, ok: false, at: t.toISOString(), staffId: 's1',
            action: ACTIONS[0], note: 'Éjszakára nyitva maradt az ajtó.',
          });
          const again = new Date(t.getTime() + 35 * 60_000);
          tempLogs.push({ id: id('l'), deviceId: d.id, value: 3.9, ok: true, at: again.toISOString(), staffId: 's1' });
          continue;
        }
        let value: number;
        if (d.kind === 'hűtő') value = round1(1.8 + r() * 2.0);
        else if (d.kind === 'fagyasztó') value = round1(-21.5 + r() * 2.5);
        else value = round1(66 + r() * 8);
        tempLogs.push({ id: id('l'), deviceId: d.id, value, ok: inRange(value, d), at: t.toISOString(), staffId: who() });
      }
    }

    // Takarítás (a mai nap még nyitott, hogy látszódjon, mi van hátra)
    if (ago > 0) {
      const day = at(ago, 12, 0);
      for (const task of tasks) {
        const doIt =
          (task.frequency === 'napi' && !(ago === 6 && task.id === 't2')) ||
          (task.frequency === 'heti' && day.getDay() === 1) ||
          (task.frequency === 'havi' && day.getDate() === 3);
        if (!doIt) continue;
        const h = task.frequency === 'napi' ? 21 : 16;
        taskDone.push({ id: id('k'), taskId: task.id, staffId: who(), at: at(ago, h, 5 + Math.floor(r() * 40)).toISOString() });
      }
    }

    // Áruátvétel kétnaponta, két tétel
    if (ago % 2 === 0) {
      for (let k = 0; k < 2; k++) {
        const t = at(ago, 6, 40 + k * 7);
        if (t > now) continue;
        const item = DELIVERIES[deliveryIndex++ % DELIVERIES.length];
        const rejected = ago === 4 && k === 0;
        const temp = rejected ? 9.5 : item.temp ? round1(item.temp[0] + r() * (item.temp[1] - item.temp[0])) : null;
        deliveries.push({
          id: id('a'), at: t.toISOString(), supplier: rejected ? 'Hús-Pont Kft.' : item.supplier,
          product: rejected ? 'Darált sertés, 5 kg' : item.product, temp,
          packagingOk: true, dateOk: true, accepted: !rejected, staffId: who(),
          ...(rejected ? { note: 'Túl meleg volt, visszaküldtük a sofőrrel.' } : {}),
        });
      }
    }
  }

  return {
    version: 1,
    settings: { unitName: 'Napfény Bisztró', felir: '', address: '', createdAt: created, demo: true },
    staff,
    devices,
    tempLogs,
    tasks,
    taskDone,
    deliveries,
  };
}
